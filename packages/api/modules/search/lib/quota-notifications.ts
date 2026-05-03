/**
 * Quota notification engine.
 *
 * Called after every search usage event to check whether an org has crossed
 * the 80% (soft cap) or 100% (hard cap) threshold.  Emails are sent at most
 * once per billing period per threshold.
 *
 * IMPORTANT: all functions are fire-and-forget — they must never block the
 * caller (the search response path).  Errors are caught and logged.
 */

import { db, getAiWalletByEntity, type Prisma } from "@repo/database";
import { logger } from "@repo/logs";
import { sendEmail } from "@repo/mail";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SOFT_CAP_PCT = 80;
const HARD_CAP_PCT = 100;

const NOTIFICATION_TYPE_SOFT = "soft_cap_notified";
const NOTIFICATION_TYPE_HARD = "hard_cap_notified";

// ---------------------------------------------------------------------------
// Configurable threshold — read from org.metadata.softCapThreshold
// ---------------------------------------------------------------------------

interface OrgMeta {
	softCapThreshold?: number;
}

/**
 * Parse org metadata JSON.
 */
function parseOrgMeta(raw: string | null): OrgMeta {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
			return parsed as OrgMeta;
		}
		return {};
	} catch {
		return {};
	}
}

/**
 * Resolve the soft cap threshold percentage for an org.
 * Defaults to 80 if not configured in org.metadata.
 */
async function resolveSoftCapThreshold(orgId: string): Promise<number> {
	try {
		const org = await db.organization.findUnique({
			where: { id: orgId },
			select: { metadata: true },
		});
		if (!org?.metadata) return DEFAULT_SOFT_CAP_PCT;
		const meta = parseOrgMeta(org.metadata);
		return meta.softCapThreshold ?? DEFAULT_SOFT_CAP_PCT;
	} catch {
		return DEFAULT_SOFT_CAP_PCT;
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget check: if the org has crossed a notification threshold and
 * hasn't already been notified this period, send the appropriate email.
 *
 * Must NOT be awaited — wrap in `void triggerQuotaNotificationsAsync(...)`.
 */
export function triggerQuotaNotificationsAsync(
	orgId: string,
	indexId: string,
	percentUsed: number,
	periodStart: Date,
	softCapThreshold?: number,
): void {
	void Promise.resolve().then(async () => {
		try {
			const threshold = softCapThreshold ?? (await resolveSoftCapThreshold(orgId));
			await triggerQuotaNotificationsImpl(orgId, indexId, percentUsed, periodStart, threshold);
		} catch (error) {
			logger.error("quota-notifications: unhandled error", {
				error,
				orgId,
			});
		}
	});
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

async function triggerQuotaNotificationsImpl(
	orgId: string,
	indexId: string,
	percentUsed: number,
	periodStart: Date,
	softCapThreshold: number,
): Promise<void> {
	// ── Soft cap (configurable, default 80%) ──────────────────────────
	if (percentUsed >= softCapThreshold && percentUsed < HARD_CAP_PCT) {
		const alreadySent = await wasNotifiedThisPeriod(orgId, NOTIFICATION_TYPE_SOFT, periodStart);
		if (!alreadySent) {
			logger.info("quota-notifications: sending soft cap warning", {
				orgId,
				percentUsed,
				threshold: softCapThreshold,
			});
			await sendQuotaEmail(orgId, "soft", softCapThreshold);
			await recordNotificationSent(indexId, orgId, NOTIFICATION_TYPE_SOFT);
			// Log to AiWalletTransaction as soft_cap_warning (fire-and-forget)
			void logSoftCapWarning(orgId, percentUsed, softCapThreshold, periodStart);
			return;
		}
	}

	// ── Hard cap (100%) ───────────────────────────────────────────────
	if (percentUsed >= HARD_CAP_PCT) {
		const alreadySent = await wasNotifiedThisPeriod(orgId, NOTIFICATION_TYPE_HARD, periodStart);
		if (!alreadySent) {
			logger.info("quota-notifications: sending hard cap warning", {
				orgId,
				percentUsed,
			});
			await sendQuotaEmail(orgId, "hard");
			await recordNotificationSent(indexId, orgId, NOTIFICATION_TYPE_HARD);
			return;
		}
	}
}

// ---------------------------------------------------------------------------
// AiWalletTransaction logging
// ---------------------------------------------------------------------------

/**
 * Create an AiWalletTransaction record for the soft cap warning event.
 * Fire-and-forget — errors are caught and logged.
 */
async function logSoftCapWarning(
	orgId: string,
	percentUsed: number,
	threshold: number,
	periodStart: Date,
): Promise<void> {
	try {
		const wallet = await getAiWalletByEntity({ organizationId: orgId });
		if (!wallet) {
			logger.debug("quota-notifications: no wallet for soft cap log", { orgId });
			return;
		}

		// Idempotency key: one entry per org per billing period
		const periodKey = periodStart.toISOString().slice(0, 7); // "YYYY-MM"
		const idempotencyKey = `soft_cap_warning_${orgId}_${periodKey}`;

		// Check if already logged this period (dedup)
		const existing = await db.aiWalletTransaction.findUnique({
			where: { idempotencyKey },
			select: { id: true },
		});
		if (existing) return;

		await db.aiWalletTransaction.create({
			data: {
				walletId: wallet.id,
				organizationId: orgId,
				type: "soft_cap_warning",
				direction: "credit",
				amountKopecks: BigInt(0),
				currency: "RUB",
				source: "system",
				idempotencyKey,
				metadata: {
					percentUsed: Math.round(percentUsed),
					threshold,
					periodStart: periodStart.toISOString(),
				} as Prisma.InputJsonValue,
			},
		});

		logger.info("quota-notifications: soft cap warning logged to wallet", {
			orgId,
			walletId: wallet.id,
			percentUsed: Math.round(percentUsed),
			threshold,
		});
	} catch (error) {
		logger.error("quota-notifications: failed to log soft cap warning", {
			error,
			orgId,
		});
	}
}

// ---------------------------------------------------------------------------
// Dedup check
// ---------------------------------------------------------------------------

/**
 * Returns true if a notification of the given type was already recorded
 * this billing period (createdAt >= periodStart).
 */
async function wasNotifiedThisPeriod(
	orgId: string,
	notificationType: string,
	periodStart: Date,
): Promise<boolean> {
	const existing = await db.searchUsageEvent.findFirst({
		where: {
			organizationId: orgId,
			type: notificationType,
			createdAt: { gte: periodStart },
		},
		select: { id: true },
	});
	return existing !== null;
}

// ---------------------------------------------------------------------------
// Record notification sent
// ---------------------------------------------------------------------------

async function recordNotificationSent(indexId: string, orgId: string, type: string): Promise<void> {
	await db.searchUsageEvent.create({
		data: {
			indexId,
			organizationId: orgId,
			type,
			count: 0,
			metadata: {} as unknown as Prisma.InputJsonValue,
		},
	});
}

// ---------------------------------------------------------------------------
// Email sending
// ---------------------------------------------------------------------------

async function sendQuotaEmail(
	orgId: string,
	threshold: "soft" | "hard",
	softCapPct?: number,
): Promise<void> {
	// Get org + plan info
	const org = await db.organization.findUnique({
		where: { id: orgId },
		include: {
			members: {
				include: { user: true },
				where: { role: { in: ["owner", "admin"] } },
			},
		},
	});

	if (!org) {
		logger.warn("quota-notifications: org not found", { orgId });
		return;
	}

	// Determine plan name (simplified: check first subscription purchase)
	let planName = "Free";
	try {
		const purchase = await db.purchase.findFirst({
			where: { organizationId: orgId, type: "SUBSCRIPTION", status: "active" },
			orderBy: { createdAt: "desc" },
		});
		if (purchase?.priceId) {
			const { getPlanIdByProviderPriceId } = await import("@repo/payments");
			const pid = getPlanIdByProviderPriceId(purchase.priceId);
			if (pid) planName = pid.charAt(0).toUpperCase() + pid.slice(1);
		}
	} catch {
		// fallback to "Free"
	}

	// Send to all org owners/admins
	const billingUrl = `https://aacsearch.app/org/${org.slug}/settings/billing`;

	const emailPromises = org.members.map((member) => {
		const base = { to: member.user.email };
		if (threshold === "soft") {
			return sendEmail({
				...base,
				templateId: "quotaSoftCap",
				context: {
					orgName: org.name,
					planName,
					percentUsed: softCapPct ?? DEFAULT_SOFT_CAP_PCT,
					remaining: 0,
					billingUrl,
				},
			}).catch((error) => {
				logger.error("quota-notifications: failed to send soft cap email", {
					error,
					orgId,
					userId: member.userId,
				});
			});
		}
		return sendEmail({
			...base,
			templateId: "quotaHardCap",
			context: {
				orgName: org.name,
				planName,
				overageEnabled: false,
				billingUrl,
			},
		}).catch((error) => {
			logger.error("quota-notifications: failed to send hard cap email", {
				error,
				orgId,
				userId: member.userId,
			});
		});
	});

	await Promise.allSettled(emailPromises);
}
