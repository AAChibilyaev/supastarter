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
		p50: boolean;
		p80: boolean;
		p100: boolean;
	};
	ingest: {
		p50: boolean;
		p80: boolean;
		p100: boolean;
	};
}

interface OrgMetadata {
	quotaAlerts?: QuotaAlertState;
	slackWebhookUrl?: string;
	/** Custom alert thresholds (0.0–1.0). Defaults to [0.5, 0.8, 1.0]. */
	quotaAlertThresholds?: number[];
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

const DEFAULT_THRESHOLDS = [0.5, 0.8, 1.0];

const THRESHOLD_KEYS: Record<number, keyof QuotaAlertState["search"]> = {
	0.5: "p50",
	0.8: "p80",
	1.0: "p100",
};

/** Map numeric threshold to the alert state key used in OrgMetadata. */
function thresholdToKey(threshold: number): keyof QuotaAlertState["search"] {
	return THRESHOLD_KEYS[threshold] ?? "p80";
}

function getThresholdsToAlert(
	alerts: QuotaAlertState | undefined,
	resource: "search" | "ingest",
	percentUsed: number,
	customThresholds?: number[],
): number[] {
	const thresholds: number[] = [];
	const state = alerts?.[resource];
	const activeThresholds = customThresholds ?? DEFAULT_THRESHOLDS;

	for (const threshold of activeThresholds) {
		const key = thresholdToKey(threshold);
		const alreadySent = state?.[key] ?? false;
		if (percentUsed >= threshold && !alreadySent) {
			thresholds.push(Math.round(threshold * 100));
		}
	}

	return thresholds;
}

function updateAlertState(
	state: QuotaAlertState | undefined,
	resource: "search" | "ingest",
	threshold: number,
): QuotaAlertState {
	const current = state ?? {
		search: { p50: false, p80: false, p100: false },
		ingest: { p50: false, p80: false, p100: false },
	};
	const key = threshold >= 100 ? "p100" : threshold >= 80 ? "p80" : "p50";
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
	const {
		org,
		resource,
		threshold,
		percentUsed,
		current,
		limit,
		planName,
		members,
		slackWebhookUrl,
	} = params;
	// Slack message text still needs resource label
	const resourceLabel = resource === "search" ? "search queries" : "indexed documents";
	const usageStr = formatUsage(current, limit);
	const headline =
		threshold >= 100
			? `Monthly ${resourceLabel} limit reached`
			: `Monthly ${resourceLabel} usage at ${(percentUsed * 100).toFixed(0)}%`;
	const dashboardLink = `/org/${org.id}/settings/billing`;

	// Send email notifications to all owners/admins
	await Promise.all(
		members.map((m) => {
			const templateId = threshold >= 100 ? "quotaHardCap" : "quotaSoftCap";
			const context =
				threshold >= 100
					? ({
							orgName: org.name,
							planName,
							overageEnabled: false, // overage status is passed separately
							billingUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://aacsearch.app"}/org/${org.id}/settings/billing`,
						} as const)
					: ({
							orgName: org.name,
							planName,
							percentUsed: percentUsed * 100,
							remaining: limit - current,
							billingUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://aacsearch.app"}/org/${org.id}/settings/billing`,
						} as const);
			return sendEmail({
				to: m.user.email,
				locale:
					(m.user.locale as Parameters<typeof sendEmail>[0] extends { locale?: infer L }
						? L
						: never) ?? undefined,
				templateId,
				context,
			}).catch((err: unknown) =>
				logger.error("sendThresholdAlert: email failed", {
					error: err,
					userId: m.userId,
					orgId: org.id,
				}),
			);
		}),
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
		threshold: threshold >= 100 ? "limit reached" : "80% threshold",
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
