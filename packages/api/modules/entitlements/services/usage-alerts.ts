/**
 * Usage Alerts Service
 *
 * Monitors quota usage and sends alerts when thresholds are crossed.
 * Thresholds: 80% (warning) and 100% (limit reached).
 *
 * Alert state is tracked in organization.metadata JSON field:
 *   { quotaAlerts: { search: { p80: boolean, p100: boolean }, ingest: { p80: boolean, p100: boolean } } }
 *   { slackWebhookUrl: string | undefined }
 *
 * This avoids schema changes (Invariant 9 — DB is FROZEN).
 */
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { sendEmail } from "@repo/mail";

import { buildQuotaAlertMessage, sendSlackAlert } from "./slack-notifier";

// ─── Types ──────────────────────────────────────────────────────

interface QuotaAlertState {
	search: {
		p80: boolean;
		p100: boolean;
	};
	ingest: {
		p80: boolean;
		p100: boolean;
	};
}

interface OrgMetadata {
	quotaAlerts?: QuotaAlertState;
	slackWebhookUrl?: string;
}

// ─── Alert state helpers ────────────────────────────────────────

function parseOrgMetadata(raw: string | null): OrgMetadata {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
			return parsed as OrgMetadata;
		}
		return {};
	} catch {
		return {};
	}
}

function getThresholdsToAlert(
	alerts: QuotaAlertState | undefined,
	resource: "search" | "ingest",
	percentUsed: number,
): number[] {
	const thresholds: number[] = [];
	const state = alerts?.[resource];

	// 80% threshold — only if not already sent
	if (percentUsed >= 0.8 && !state?.p80) {
		thresholds.push(80);
	}

	// 100% threshold — only if not already sent
	if (percentUsed >= 1.0 && !state?.p100) {
		thresholds.push(100);
	}

	return thresholds;
}

function updateAlertState(
	state: QuotaAlertState | undefined,
	resource: "search" | "ingest",
	threshold: number,
): QuotaAlertState {
	const current = state ?? { search: { p80: false, p100: false }, ingest: { p80: false, p100: false } };
	const key = threshold >= 100 ? "p100" : "p80";
	return {
		...current,
		[resource]: {
			...current[resource],
			[key]: true,
		},
	};
}

// ─── Email helpers ──────────────────────────────────────────────

function formatUsage(current: number, limit: number): string {
	if (limit === -1) return `${current.toLocaleString()} / Unlimited`;
	return `${current.toLocaleString()} / ${limit.toLocaleString()}`;
}

// ─── Main entry point ───────────────────────────────────────────

/**
 * Check quota usage and send alerts if thresholds are freshly crossed.
 * Called after each search/ingest event is recorded.
 *
 * Designed to be fire-and-forget (async, not awaited in request path).
 */
export async function checkAndSendQuotaAlerts(params: {
	organizationId: string;
	resource: "search" | "ingest";
	percentUsed: number;
	current: number;
	limit: number;
}): Promise<void> {
	const { organizationId, resource, percentUsed, current, limit } = params;

	try {
		const org = await db.organization.findUnique({
			where: { id: organizationId },
			select: { id: true, name: true, metadata: true },
		});

		if (!org) {
			logger.warn("checkQuotaAlerts: org not found", { organizationId });
			return;
		}

		const metadata = parseOrgMetadata(org.metadata);
		const thresholds = getThresholdsToAlert(metadata.quotaAlerts, resource, percentUsed);

		if (thresholds.length === 0) {
			return; // No new thresholds crossed
		}

		// Fetch org members (owners/admins) for email notifications
		const members = await db.member.findMany({
			where: {
				organizationId,
				role: { in: ["owner", "admin"] },
			},
			select: {
				userId: true,
				user: {
					select: { email: true, locale: true },
				},
			},
		});

		const resolvedPlan = await resolvePlanName(organizationId);

		// Send alerts for each newly crossed threshold
		for (const threshold of thresholds) {
			await sendThresholdAlert({
				org,
				resource,
				threshold,
				percentUsed,
				current,
				limit,
				planName: resolvedPlan,
				members,
				slackWebhookUrl: metadata.slackWebhookUrl,
			});

			// Update metadata to mark threshold as sent
			const newState = updateAlertState(metadata.quotaAlerts, resource, threshold);
			const newMetadata: OrgMetadata = {
				...metadata,
				quotaAlerts: newState,
			};

			await db.organization.update({
				where: { id: organizationId },
				data: { metadata: JSON.stringify(newMetadata) },
			});
		}
	} catch (error) {
		logger.error("checkAndSendQuotaAlerts failed", { error, organizationId, resource });
	}
}

// ─── Threshold alert sender ─────────────────────────────────────

async function sendThresholdAlert(params: {
	org: { id: string; name: string };
	resource: "search" | "ingest";
	threshold: number;
	percentUsed: number;
	current: number;
	limit: number;
	planName: string;
	members: Array<{ userId: string; user: { email: string; locale: string | null } }>;
	slackWebhookUrl?: string;
}): Promise<void> {
	const { org, resource, threshold, percentUsed, current, limit, planName, members, slackWebhookUrl } = params;
	const resourceLabel = resource === "search" ? "search queries" : "indexed documents";
	const thresholdLabel = threshold >= 100 ? "limit reached" : "80% threshold";
	const usageStr = formatUsage(current, limit);

	const headline =
		threshold >= 100
			? `Monthly ${resourceLabel} limit reached`
			: `Monthly ${resourceLabel} usage at ${(percentUsed * 100).toFixed(0)}%`;

	const message =
		threshold >= 100
			? `Your organization "${org.name}" has used all ${usageStr} ${resourceLabel} this month. Upgrade your plan to avoid disruption.`
			: `Your organization "${org.name}" has used ${(percentUsed * 100).toFixed(0)}% of its monthly ${resourceLabel} limit (${usageStr}).`;

	const dashboardLink = `/org/${org.id}/settings/billing`;

	// Send email notifications to all owners/admins
	await Promise.all(
		members.map((m) =>
			sendEmail({
				to: m.user.email,
				locale: (m.user.locale as Parameters<typeof sendEmail>[0] extends { locale?: infer L } ? L : never) ?? undefined,
				templateId: "notification",
				context: {
					headline,
					title: headline,
					message,
					link: dashboardLink,
				},
			}).catch((err: unknown) =>
				logger.error("sendThresholdAlert: email failed", {
					error: err,
					userId: m.userId,
					orgId: org.id,
				}),
			),
		),
	);

	// Send Slack alert if webhook is configured
	if (slackWebhookUrl) {
		const slackMsg = buildQuotaAlertMessage({
			orgName: org.name,
			resource,
			percentUsed: percentUsed * 100,
			threshold,
			current,
			limit,
			planName,
			dashboardUrl: dashboardLink,
		});

		await sendSlackAlert(slackWebhookUrl, slackMsg).catch((err: unknown) =>
			logger.error("sendThresholdAlert: Slack failed", { error: err, orgId: org.id }),
		);
	}

	logger.info("Quota alert sent", {
		orgId: org.id,
		resource,
		threshold: thresholdLabel,
		recipients: members.length,
		slack: !!slackWebhookUrl,
	});
}

// ─── Plan resolution helper (lightweight, no cache dependency) ──

async function resolvePlanName(orgId: string): Promise<string> {
	try {
		const purchase = await db.purchase.findFirst({
			where: { organizationId: orgId, type: "SUBSCRIPTION" },
			orderBy: { createdAt: "desc" },
			select: { priceId: true },
		});

		if (!purchase) return "Free";

		const { getPlanIdByProviderPriceId } = await import("@repo/payments");
		const planId = getPlanIdByProviderPriceId(purchase.priceId);
		const planNames: Record<string, string> = {
			free: "Free",
			starter: "Starter",
			pro: "Pro",
			business: "Business",
			enterprise: "Enterprise",
		};
		return planNames[planId] ?? "Free";
	} catch {
		return "Free";
	}
}

/**
 * Reset quota alert state for an org (e.g. at the start of a new billing period).
 * This allows alerts to fire again if the org hits 80%/100% in the new period.
 */
export async function resetQuotaAlerts(organizationId: string): Promise<void> {
	try {
		const org = await db.organization.findUnique({
			where: { id: organizationId },
			select: { metadata: true },
		});

		if (!org) return;

		const metadata = parseOrgMetadata(org.metadata);
		if (!metadata.quotaAlerts) return;

		// Reset all alert flags
		const newMetadata: OrgMetadata = {
			...metadata,
			quotaAlerts: {
				search: { p80: false, p100: false },
				ingest: { p80: false, p100: false },
			},
		};

		await db.organization.update({
			where: { id: organizationId },
			data: { metadata: JSON.stringify(newMetadata) },
		});

		logger.info("Quota alerts reset for org", { organizationId });
	} catch (error) {
		logger.error("resetQuotaAlerts failed", { error, organizationId });
	}
}

/**
 * Manually set Slack webhook URL for an org.
 */
export async function setSlackWebhookUrl(
	organizationId: string,
	webhookUrl: string | null,
): Promise<void> {
	try {
		const org = await db.organization.findUnique({
			where: { id: organizationId },
			select: { metadata: true },
		});

		if (!org) return;

		const metadata = parseOrgMetadata(org.metadata);
		const newMetadata: OrgMetadata = {
			...metadata,
			slackWebhookUrl: webhookUrl ?? undefined,
		};

		await db.organization.update({
			where: { id: organizationId },
			data: { metadata: JSON.stringify(newMetadata) },
		});

		logger.info("Slack webhook URL updated", {
			organizationId,
			hasUrl: !!webhookUrl,
		});
	} catch (error) {
		logger.error("setSlackWebhookUrl failed", { error, organizationId });
	}
}
