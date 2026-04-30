import { applySubscriptionToWallet } from "@repo/billing-wallet";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { getPlanIdByProviderPriceId } from "@repo/payments";
import { config as paymentsConfig } from "@repo/payments/config";

const ACTIVE_STATUSES = new Set([
	"active",
	"trialing",
	"paid",
	"completed",
	"on_trial",
	"trial",
]);
const SYNC_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Apply included monthly AI credits to wallets for any SUBSCRIPTION purchase
 * created in the last `SYNC_WINDOW_MS` that has not yet been synced.
 *
 * Idempotency is delegated to the underlying `apply_subscription_to_wallet`
 * PL function (idempotent per (subscriptionId, current calendar month)),
 * so calling this helper on every webhook + every cron tick is safe.
 *
 * Provider-agnostic: scans the unified `Purchase` table populated by all
 * provider webhooks (stripe, lemonsqueezy, polar, creem, dodopayments).
 */
export async function syncRecentSubscriptionsToWallet(): Promise<{
	considered: number;
	applied: number;
	skipped: number;
	failed: number;
}> {
	const since = new Date(Date.now() - SYNC_WINDOW_MS);
	const purchases = await db.purchase.findMany({
		where: {
			type: "SUBSCRIPTION",
			subscriptionId: { not: null },
			updatedAt: { gte: since },
		},
		orderBy: { updatedAt: "desc" },
	});

	let applied = 0;
	let skipped = 0;
	let failed = 0;

	for (const purchase of purchases) {
		if (purchase.status && !ACTIVE_STATUSES.has(purchase.status.toLowerCase())) {
			skipped += 1;
			continue;
		}

		const planId = getPlanIdByProviderPriceId(purchase.priceId);
		if (!planId) {
			skipped += 1;
			continue;
		}

		const includedKopecks = paymentsConfig.aiWallet.monthlyIncludedByPlan[planId];
		if (!includedKopecks || includedKopecks <= BigInt(0)) {
			skipped += 1;
			continue;
		}

		try {
			await applySubscriptionToWallet({
				organizationId: purchase.organizationId,
				userId: purchase.userId,
				planId,
				subscriptionId: purchase.subscriptionId as string,
				includedKopecks,
			});
			applied += 1;
		} catch (error) {
			failed += 1;
			logger.error("syncRecentSubscriptionsToWallet: apply failed", {
				purchaseId: purchase.id,
				subscriptionId: purchase.subscriptionId,
				error,
			});
		}
	}

	return {
		considered: purchases.length,
		applied,
		skipped,
		failed,
	};
}
