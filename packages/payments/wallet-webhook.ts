import { createHash } from "node:crypto";

import { applyTopupCredit, notifyTopupPaid } from "@repo/billing-wallet";
import { db } from "@repo/database";
import { logger } from "@repo/logs";

import { walletProvider } from "./wallet-provider";

/**
 * Unified wallet webhook handler. Mounted at
 *   POST /api/webhooks/payments/<provider>
 * via the Hono entry in `packages/api/index.ts`.
 *
 * Always audits the raw event into `payment_provider_event`, even when the
 * signature is invalid — this gives a forensic trail and lets us replay after
 * fixing signing issues.
 *
 * Idempotency:
 *   - PaymentProviderEvent.idempotencyKey unique per (provider, providerEventId)
 *   - WalletTopupOrder.providerOperationId unique
 *   - applyTopupCredit RPC is itself idempotent
 */
export async function walletWebhookHandler(req: Request): Promise<Response> {
	const rawBody = await req.text();
	const verified = await walletProvider.verifyWebhook({ headers: req.headers, rawBody });

	const eventKey =
		verified.providerEventId ?? createHash("sha256").update(rawBody).digest("hex").slice(0, 32);
	const idempotencyKey = `${walletProvider.id}:${eventKey}`;

	const event = await db.paymentProviderEvent.upsert({
		where: { idempotencyKey },
		create: {
			provider: walletProvider.id,
			eventType: verified.eventType,
			providerEventId: verified.providerEventId,
			signatureValid: verified.valid,
			rawPayload: verified.rawPayload as object,
			idempotencyKey,
		},
		update: {},
	});

	if (!verified.valid) {
		logger.warn("Wallet webhook signature invalid", {
			provider: walletProvider.id,
			idempotencyKey,
		});
		return new Response("invalid signature", { status: 401 });
	}

	if (
		verified.status === "paid" &&
		verified.providerOperationId &&
		verified.providerPaymentId &&
		verified.amountKopecks != null
	) {
		try {
			const result = await applyTopupCredit({
				providerOperationId: verified.providerOperationId,
				providerPaymentId: verified.providerPaymentId,
				amountKopecks: verified.amountKopecks,
				eventId: event.id,
			});
			await db.paymentProviderEvent.update({
				where: { id: event.id },
				data: { processedAt: new Date() },
			});
			if (result.applied) {
				const order = await db.walletTopupOrder.findUnique({
					where: { id: result.orderId },
					select: { walletId: true, amountKopecks: true },
				});
				if (order) {
					await notifyTopupPaid({
						walletId: order.walletId,
						amountKopecks: order.amountKopecks,
						orderId: result.orderId,
					}).catch((notifyErr) => logger.error("notifyTopupPaid failed", { notifyErr }));
				}
			}
		} catch (err) {
			const message = (err as Error)?.message ?? String(err);
			await db.paymentProviderEvent.update({
				where: { id: event.id },
				data: { processingError: message },
			});
			logger.error("apply_topup_credit failed", { eventId: event.id, message });
			return new Response("processing failed", { status: 500 });
		}
	}

	return new Response("ok", { status: 200 });
}
