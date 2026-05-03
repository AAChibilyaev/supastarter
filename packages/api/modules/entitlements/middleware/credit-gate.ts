/**
 * Credit-gate middleware for oRPC procedures.
 *
 * Atomic balance check + reserve before paid operations.
 * Injects reservation info into context for downstream commit/release.
 *
 * Usage:
 *   export const askRag = protectedProcedure
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

import { ORPCError, os } from "@orpc/server";
import {
	type CommitAiUsageInput,
	type CommitAiUsageResult,
	AiWalletInsufficientFundsError,
	AiWalletFrozenError,
	WalletNotFoundError,
	commitAiUsage,
	releaseAiReservation,
	reserveAiCredits,
} from "@repo/billing-wallet";
import { getAiWalletByEntity } from "@repo/database";
import { logger } from "@repo/logs";

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
 * Flat-fee commit input for fixed-price operations (RAG, AI Answer, etc.).
 * These operations have a flat fee per call with no token-based costs.
 */
export interface FlatFeeCommitInput {
	reservationId: string;
	operation: string;
	provider: string;
	model: string;
	flatFeeKopecks: bigint;
	status?: CommitAiUsageInput["status"];
	requestId?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Commit a flat-fee AI usage reservation on success.
 */
export async function commitFlatFeeUsage(input: FlatFeeCommitInput): Promise<CommitAiUsageResult> {
	const markupBps = 2000; // 20% default markup
	const totalChargeKopecks =
		input.flatFeeKopecks + (input.flatFeeKopecks * BigInt(markupBps)) / BigInt(10000);

	return commitAiUsage({
		reservationId: input.reservationId,
		idempotencyKey: `commit:${input.reservationId}`,
		provider: input.provider,
		model: input.model,
		pricingRuleId: null,
		promptTokens: 0,
		completionTokens: 0,
		inputCostKopecks: BigInt(0),
		outputCostKopecks: BigInt(0),
		flatFeeKopecks: input.flatFeeKopecks,
		markupBps,
		totalChargeKopecks,
		providerCostUsdMicros: BigInt(0),
		fxRateRubPerUsdMicros: BigInt(0),
		requestId: input.requestId ?? null,
		status: input.status ?? "success",
		metadata: input.metadata ?? { operation: input.operation },
	});
}

/**
 * Release a credit reservation on error.
 * Fire-and-forget: logs but does not throw (avoids masking the original error).
 */
export async function releaseCreditReservation(
	reservationId: string,
	reason: "error" | "cancelled" = "error",
): Promise<void> {
	try {
		await releaseAiReservation({
			reservationId,
			idempotencyKey: `release:${reservationId}`,
			reason,
		});
	} catch (releaseErr) {
		logger.error(
			{ reservationId, reason, error: releaseErr },
			"releaseCreditReservation: failed to release reservation",
		);
	}
}

/**
 * Middleware that checks and reserves credits before a paid operation.
 *
 * Resolves the org/user AiWallet, atomically checks balance and reserves
 * credits, then injects reservation info into context for downstream
 * commit or release.
 *
 * @param operation - Paid operation name (e.g., 'rag_answer', 'embedding', 'rerank')
 * @param estimatedCostKopecks - Estimated cost in kopecks.
 *   For flat-fee operations this is the fixed price (e.g., BigInt(500) = 5 credits for RAG).
 *   For token-based operations the caller calculates based on input size.
 */
export function creditGate(operation: string, estimatedCostKopecks: bigint) {
	return os.$context<Record<string, unknown>>().middleware(async ({ context, next }) => {
		const session = (context as Record<string, unknown>).session as
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
				message: "AI Wallet not initialized. Visit Settings > Billing to activate.",
			});
		}

		// 2. Generate a unique idempotency key for this reservation
		const idempotencyKey = `credit-gate:${operation}:${wallet.id}:${randomUUID()}`;

		// 3. Atomically reserve credits — the PG function checks balance internally
		try {
			const reservation = await reserveAiCredits({
				walletId: wallet.id,
				userId: userId ?? null,
				organizationId: orgId ?? null,
				operation,
				estimatedKopecks: estimatedCostKopecks,
				idempotencyKey,
			});

			// 4. Pass reservation info downstream for commit/release
			return next({
				context: {
					creditReservationId: reservation.reservationId,
					creditWalletId: wallet.id,
					creditOperation: operation,
					creditEstimatedKopecks: estimatedCostKopecks,
				} satisfies CreditGateContext,
			});
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
					message: "AI Wallet not found. Visit Settings > Billing to activate.",
				});
			}
			// Unexpected error — let it propagate for 500-level handling
			throw err;
		}
	});
}
