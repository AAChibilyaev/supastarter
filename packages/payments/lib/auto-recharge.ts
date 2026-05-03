import { applyTopupCredit, notifyTopupFailed, notifyTopupPaid } from "@repo/billing-wallet";
import { db } from "@repo/database";
import { logger } from "@repo/logs";

import { getStripeClient } from "../provider/stripe";
import { getCustomerIdFromEntity } from "./customer";

const PROCESSING_GRACE_MS = 60_000; // 1 minute — skip very-fresh orders
const MAX_RETRY_MS = 24 * 60 * 60 * 1000; // 24 hours — max age to retry a failed order
const MAX_ORDERS_PER_RUN = 50;

/**
 * Process pending auto-recharge orders by creating Stripe PaymentIntents.
 *
 * Finds WalletTopupOrder records with provider="auto_recharge" and status="pending"
 * that are older than the grace period, looks up the wallet owner's Stripe customer ID,
 * and creates a PaymentIntent with off_session confirmation.
 *
 * Runs idempotently — each order is processed at most once per run.
 */
export async function processAutoRechargePayments(): Promise<{
	scanned: number;
	charged: number;
	failed: number;
	needsAction: number;
}> {
	const cutoffMin = new Date(Date.now() - PROCESSING_GRACE_MS);
	const cutoffMax = new Date(Date.now() - MAX_RETRY_MS);

	const orders = await db.walletTopupOrder.findMany({
		where: {
			provider: "auto_recharge",
			status: "pending",
			createdAt: { lte: cutoffMin, gte: cutoffMax },
		},
		take: MAX_ORDERS_PER_RUN,
		orderBy: { createdAt: "asc" },
	});

	let charged = 0;
	let failed = 0;
	let needsAction = 0;

	for (const order of orders) {
		try {
			const result = await processSingleOrder(order);
			if (result === "charged") charged++;
			else if (result === "needs_action") needsAction++;
			else failed++;
		} catch (err) {
			failed++;
			logger.error("processAutoRechargePayments: order failed", {
				orderId: order.id,
				error: String(err),
			});
		}
	}

	return { scanned: orders.length, charged, failed, needsAction };
}

type ProcessResult = "charged" | "failed" | "needs_action";

async function processSingleOrder(order: {
	id: string;
	walletId: string;
	organizationId: string | null;
	userId: string | null;
	amountKopecks: bigint;
}): Promise<ProcessResult> {
	// Get wallet to find owner
	const wallet = await db.aiWallet.findUnique({
		where: { id: order.walletId },
		select: { organizationId: true, userId: true, status: true },
	});

	if (!wallet || wallet.status !== "active") {
		await failOrder(order.id, "Wallet not found or not active");
		return "failed";
	}

	// Get Stripe customer ID
	const ownerId = wallet.organizationId ?? wallet.userId;
	if (!ownerId) {
		await failOrder(order.id, "No owner ID on wallet");
		return "failed";
	}

	const stripeCustomerId = await getCustomerIdFromEntity(
		wallet.organizationId
			? { organizationId: wallet.organizationId }
			: { userId: wallet.userId! },
	);

	if (!stripeCustomerId) {
		await failOrder(order.id, "No Stripe customer ID configured for wallet owner");
		return "failed";
	}

	// Create Stripe PaymentIntent and confirm it off-session
	try {
		const stripe = getStripeClient();
		const amountCents = Number(order.amountKopecks) / 100;
		const amountStripe = Math.round(amountCents * 100); // Stripe uses cents

		const paymentIntent = await stripe.paymentIntents.create({
			amount: amountStripe,
			currency: "usd",
			customer: stripeCustomerId,
			off_session: true,
			confirm: true,
			description: `AI Wallet auto-recharge (${(Number(order.amountKopecks) / 100).toFixed(2)} USD)`,
			metadata: {
				auto_recharge_order_id: order.id,
				wallet_id: order.walletId,
			},
		});

		if (paymentIntent.status === "succeeded") {
			// Payment succeeded — credit the wallet
			const result = await applyTopupCredit({
				providerOperationId: paymentIntent.id,
				providerPaymentId: paymentIntent.id,
				amountKopecks: order.amountKopecks,
				eventId: `auto_recharge_pi:${paymentIntent.id}`,
			});

			if (result.applied) {
				await notifyTopupPaid({
					walletId: order.walletId,
					amountKopecks: order.amountKopecks,
					orderId: order.id,
				});
			}

			// Mark order as paid
			await db.walletTopupOrder.update({
				where: { id: order.id },
				data: {
					status: "paid",
					providerPaymentId: paymentIntent.id,
					providerOperationId: paymentIntent.id,
					paidAt: new Date(),
				},
			});

			logger.info("processAutoRechargePayments: charged", {
				orderId: order.id,
				walletId: order.walletId,
				amountKopecks: Number(order.amountKopecks),
				piId: paymentIntent.id,
			});

			return "charged";
		}

		if (
			paymentIntent.status === "requires_action" ||
			paymentIntent.status === "requires_confirmation" ||
			paymentIntent.status === "requires_payment_method"
		) {
			// Needs SCA authentication — mark as needs_action, notify user
			await db.walletTopupOrder.update({
				where: { id: order.id },
				data: {
					providerPaymentId: paymentIntent.id,
					metadata: {
						stripeStatus: paymentIntent.status,
						nextAction: paymentIntent.next_action?.type ?? null,
						clientSecret: paymentIntent.client_secret,
					},
					status: "pending",
				},
			});

			await notifyTopupFailed({
				walletId: order.walletId,
				orderId: order.id,
				reason: "Auto-recharge requires additional authentication. Please visit your billing settings to complete the payment.",
			});

			logger.warn("processAutoRechargePayments: needs authentication", {
				orderId: order.id,
				walletId: order.walletId,
				piId: paymentIntent.id,
				status: paymentIntent.status,
			});

			return "needs_action";
		}

		// Payment failed
		await failOrder(order.id, `Stripe PaymentIntent status: ${paymentIntent.status}`);

		await notifyTopupFailed({
			walletId: order.walletId,
			orderId: order.id,
			reason: `Auto-recharge failed: ${paymentIntent.last_payment_error?.message ?? paymentIntent.status}`,
		});

		logger.error("processAutoRechargePayments: payment failed", {
			orderId: order.id,
			walletId: order.walletId,
			piId: paymentIntent.id,
			status: paymentIntent.status,
			error: paymentIntent.last_payment_error?.message,
		});

		return "failed";
	} catch (stripeError) {
		// Handle Stripe API errors (e.g., no default payment method)
		const message = (stripeError as Error)?.message ?? String(stripeError);

		// Card errors are expected when user has no saved payment method
		if (
			message.includes("No default payment method") ||
			message.includes("requires a payment method")
		) {
			await failOrder(order.id, "No saved payment method found");
			await notifyTopupFailed({
				walletId: order.walletId,
				orderId: order.id,
				reason: "Auto-recharge could not be processed — no saved payment method. Please add a card in your billing settings.",
			});
			return "failed";
		}

		await failOrder(order.id, `Stripe error: ${message}`);
		await notifyTopupFailed({
			walletId: order.walletId,
			orderId: order.id,
			reason: `Auto-recharge failed: ${message}`,
		});

		logger.error("processAutoRechargePayments: Stripe error", {
			orderId: order.id,
			walletId: order.walletId,
			error: message,
		});

		return "failed";
	}
}

async function failOrder(orderId: string, reason: string): Promise<void> {
	await db.walletTopupOrder.update({
		where: { id: orderId },
		data: {
			status: "failed",
			metadata: {
				failureReason: reason,
				failedAt: new Date().toISOString(),
			},
		},
	});
}
