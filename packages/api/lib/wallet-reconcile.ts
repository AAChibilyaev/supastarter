import { applyTopupCredit } from "@repo/billing-wallet";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { walletProvider } from "@repo/payments";

const RECONCILE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const RECONCILE_GRACE_MS = 2 * 60 * 1000; // ignore very-fresh orders (webhook may still arrive)

/**
 * Reconcile pending wallet top-up orders that the webhook may have missed.
 * For every `WalletTopupOrder` in `pending` status (older than the grace period
 * and younger than the window), call `walletProvider.getPaymentStatus` and:
 *   - if paid → apply credit (idempotent via `apply_topup_credit` PL function)
 *   - if failed/cancelled/expired → mark order accordingly
 */
export async function reconcileStaleTopupOrders(): Promise<{
	scanned: number;
	credited: number;
	failed: number;
	stillPending: number;
}> {
	const now = Date.now();
	const minAge = new Date(now - RECONCILE_GRACE_MS);
	const maxAge = new Date(now - RECONCILE_WINDOW_MS);

	const orders = await db.walletTopupOrder.findMany({
		where: {
			status: "pending",
			provider: walletProvider.id,
			providerPaymentId: { not: null },
			createdAt: { gte: maxAge, lte: minAge },
		},
		orderBy: { createdAt: "asc" },
		take: 200,
	});

	let credited = 0;
	let failed = 0;
	let stillPending = 0;

	for (const order of orders) {
		const providerPaymentId = order.providerPaymentId;
		if (!providerPaymentId) continue;

		try {
			const status = await walletProvider.getPaymentStatus({ providerPaymentId });

			if (status.status === "paid" && status.providerOperationId) {
				await applyTopupCredit({
					providerOperationId: status.providerOperationId,
					providerPaymentId,
					amountKopecks: order.amountKopecks,
					eventId: `reconcile:${order.id}`,
				});
				credited += 1;
				continue;
			}

			if (status.status === "failed" || status.status === "cancelled") {
				await db.walletTopupOrder.update({
					where: { id: order.id },
					data: {
						status: status.status,
						metadata: { reconciledAt: new Date().toISOString() },
					},
				});
				failed += 1;
				continue;
			}

			if (status.status === "expired") {
				await db.walletTopupOrder.update({
					where: { id: order.id },
					data: {
						status: "expired",
						metadata: { reconciledAt: new Date().toISOString() },
					},
				});
				failed += 1;
				continue;
			}

			stillPending += 1;
		} catch (error) {
			logger.error("reconcileStaleTopupOrders: provider status fetch failed", {
				orderId: order.id,
				error,
			});
			stillPending += 1;
		}
	}

	return {
		scanned: orders.length,
		credited,
		failed,
		stillPending,
	};
}
