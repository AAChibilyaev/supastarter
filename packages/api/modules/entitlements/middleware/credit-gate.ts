/**
 * Credit-gate middleware for oRPC procedures.
 *
 * Atomic balance check + reserve before paid operations.
 * Injects reservation info into context for downstream commit/release.
 */

import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/server";
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
 */
export interface CreditGateContext {
	creditReservationId: string;
	creditWalletId: string;
	creditOperation: string;
	creditEstimatedKopecks: bigint;
}

/**
 * Flat-fee commit input for fixed-price operations (RAG, AI Answer, etc.).
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
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function creditGate(operation: string, estimatedCostKopecks: bigint): any {
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

		const wallet = await getAiWalletByEntity(
			orgId ? { organizationId: orgId } : { userId: userId! },
		);

		if (!wallet) {
			throw new ORPCError("FAILED_PRECONDITION", {
				message: "AI Wallet not initialized. Visit Settings > Billing to activate.",
			});
		}

		const idempotencyKey = `credit-gate:${operation}:${wallet.id}:${randomUUID()}`;

		try {
			const reservation = await reserveAiCredits({
				walletId: wallet.id,
				userId: userId ?? null,
				organizationId: orgId ?? null,
				operation,
				estimatedKopecks: estimatedCostKopecks,
				idempotencyKey,
			});

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
			throw err;
		}
	};
}
