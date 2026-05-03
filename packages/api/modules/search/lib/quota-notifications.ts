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

import { db, type Prisma } from "@repo/database";
import { logger } from "@repo/logs";
import { sendEmail } from "@repo/mail";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOFT_CAP_PCT = 80;
const HARD_CAP_PCT = 100;

const NOTIFICATION_TYPE_SOFT = "soft_cap_notified";
const NOTIFICATION_TYPE_HARD = "hard_cap_notified";

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
): void {
	void Promise.resolve().then(async () => {
		try {
			await triggerQuotaNotificationsImpl(orgId, indexId, percentUsed, periodStart);
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
): Promise<void> {
	// ── Soft cap (80%) ────────────────────────────────────────────────
	if (percentUsed >= SOFT_CAP_PCT && percentUsed < HARD_CAP_PCT) {
		const alreadySent = await wasNotifiedThisPeriod(orgId, NOTIFICATION_TYPE_SOFT, periodStart);
		if (!alreadySent) {
			logger.info("quota-notifications: sending soft cap warning", {
				orgId,
				percentUsed,
			});
			await sendQuotaEmail(orgId, "soft");
			await recordNotificationSent(indexId, orgId, NOTIFICATION_TYPE_SOFT);
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

async function sendQuotaEmail(orgId: string, threshold: "soft" | "hard"): Promise<void> {
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
					percentUsed: SOFT_CAP_PCT,
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
