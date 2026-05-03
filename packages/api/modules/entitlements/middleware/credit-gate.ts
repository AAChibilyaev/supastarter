/**
 * Credit-gate middleware for oRPC procedures.
 *
 * Atomic balance check + reserve before paid operations.
 * Injects reservation info into context for downstream commit/release.
 *
 * Usage:
 *   export const askRag = protectedProcedure
 *     .use(featureGate('rag'))
 *     .use(creditGate('rag', BigInt(500))) // 5 credits = 500 kopecks
 *     .handler(async ({ context }) => {
 *       const { creditReservationId } = context as CreditGateContext;
 *       // ... do work ...
 *       await commitAiUsage({ reservationId: creditReservationId, ... });
 *     })
 *
 * Error handling:
 *   - AI_WALLET_INSUFFICIENT_FUNDS → FAILED_PRECONDITION with amounts
 *   - WALLET_FROZEN → FAILED_PRECONDITION with status
 *   - WALLET_NOT_FOUND → FAILED_PRECONDITION with activation link
 */

import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/server";
import {
  type ReserveAiCreditsInput,
  type ReserveAiCreditsResult,
  AiWalletInsufficientFundsError,
  AiWalletFrozenError,
  WalletNotFoundError,
  reserveAiCredits,
} from "@repo/billing-wallet";
import { getAiWalletByEntity } from "@repo/database";

/**
 * Context extension injected by creditGate on successful reservation.
 * Pass `creditReservationId` to commitAiUsage / releaseAiReservation.
 */
export interface CreditGateContext {
	creditReservationId: string;
	creditWalletId: string;
	creditOperation: string;
	creditEstimatedKopecks: bigint;
}

/**
 * Middleware that checks and reserves credits before a paid operation.
 *
 * @param operation - Paid operation name (e.g., 'rag', 'rag_answer', 'embedding', 'rerank')
 * @param estimatedCostKopecks - Estimated cost in kopecks.
 *   For flat-fee operations this is the fixed price (e.g., 5n for RAG).
 *   For token-based operations (embedding, transcription) the caller calculates
 *   based on input size before calling the middleware.
 */
export function creditGate(operation: string, estimatedCostKopecks: bigint) {
	return async ({
		context,
		next,
	}: {
		context: Record<string, unknown>;
		next: (opts?: { context?: Record<string, unknown> }) => Promise<unknown>;
	}) => {
		const session = context.session as
			| { activeOrganizationId?: string; userId: string }
			| undefined;
		const orgId = session?.activeOrganizationId;
		const userId = session?.userId;

		if (!orgId && !userId) {
			throw new ORPCError("FORBIDDEN", {
				message: "No active organization or user session.",
			});
		}

		// 1. Resolve AiWallet for the org (or user as fallback)
		const wallet = await getAiWalletByEntity(
			orgId ? { organizationId: orgId } : { userId: userId! },
		);

		if (!wallet) {
			throw new ORPCError("FAILED_PRECONDITION", {
				message:
					"AI Wallet not initialized. Visit Settings > Billing to activate.",
			});
		}

		// 2. Generate a unique idempotency key for this reservation
		const idempotencyKey = `credit-gate:${operation}:${wallet.id}:${randomUUID()}`;

		// 3. Atomically reserve credits — the PG function checks balance internally
		let reservation: ReserveAiCreditsResult;
		try {
			reservation = await reserveAiCredits({
				walletId: wallet.id,
				userId: userId ?? null,
				organizationId: orgId ?? null,
				operation,
				estimatedKopecks: estimatedCostKopecks,
				idempotencyKey,
			} satisfies ReserveAiCreditsInput);
		} catch (err) {
			if (err instanceof AiWalletInsufficientFundsError) {
				const required = Number(err.requiredKopecks) / 100;
				const available = Number(err.availableKopecks) / 100;
				throw new ORPCError("FAILED_PRECONDITION", {
					message: `Insufficient credits for "${operation}". Required: ${required.toFixed(2)}, Available: ${available.toFixed(2)}. Top up at Settings > Billing.`,
				});
			}
			if (err instanceof AiWalletFrozenError) {
				throw new ORPCError("FAILED_PRECONDITION", {
					message: `AI Wallet is frozen (${err.message}). Contact support to reactivate.`,
				});
			}
			if (err instanceof WalletNotFoundError) {
				throw new ORPCError("FAILED_PRECONDITION", {
					message:
						"AI Wallet not found. Visit Settings > Billing to activate.",
				});
			}
			// Unexpected error — let it propagate for 500-level handling
			throw err;
		}

		// 4. Pass reservation info downstream for commit/release
		return next({
			context: {
				...context,
				creditReservationId: reservation.reservationId,
				creditWalletId: wallet.id,
				creditOperation: operation,
				creditEstimatedKopecks: estimatedCostKopecks,
			} satisfies CreditGateContext,
		});
	};
}
