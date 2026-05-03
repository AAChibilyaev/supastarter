/**
 * Credit-gate middleware for oRPC procedures.
 *
 * Reserves AI wallet credits before the handler runs and commits or releases
 * the reservation based on success/failure.
 *
 * Usage:
 *   export const myProcedure = protectedProcedure
 *     .use(creditGate("operation_name", BigInt(500)))
 *     .handler(async ({ context, ...rest }) => {
 *       const { creditReservationId } = rest as unknown as CreditGateContext;
 *       try {
 *         // ... do AI work ...
 *         await commitFlatFeeUsage(context, creditReservationId, BigInt(500));
 *         return result;
 *       } catch (err) {
 *         await releaseCreditReservation(context, creditReservationId);
 *         throw err;
 *       }
 *     });
 */

import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/server";
import {
	AiWalletInsufficientFundsError,
	reserveAiCredits,
	releaseAiReservation,
	commitAiUsage,
} from "@repo/billing-wallet";
import { getAiWalletByOrganizationId, getAiWalletByUserId } from "@repo/database";
import { logger } from "@repo/logs";

export interface CreditGateContext {
	creditReservationId: string;
	creditWalletId: string;
	creditIdempotencyKey: string;
}

type ProtectedContext = {
	user: { id: string };
	session: { activeOrganizationId?: string };
};

/**
 * Resolve the AI wallet for the current user/org context.
 * Prefers organization wallet when there is an active org.
 */
async function resolveWalletForContext(
	context: ProtectedContext,
): Promise<{ walletId: string; userId: string | null; organizationId: string | null } | null> {
	const orgId = context.session?.activeOrganizationId ?? undefined;

	if (orgId) {
		const wallet = await getAiWalletByOrganizationId(orgId);
		if (wallet) {
			return {
				walletId: wallet.id,
				userId: null,
				organizationId: orgId,
			};
		}
	}

	const wallet = await getAiWalletByUserId(context.user.id);
	if (wallet) {
		return {
			walletId: wallet.id,
			userId: context.user.id,
			organizationId: null,
		};
	}

	return null;
}

/**
 * Middleware that reserves AI wallet credits before the handler executes.
 * Injects `creditReservationId`, `creditWalletId`, and `creditIdempotencyKey`
 * into the context for use by `commitFlatFeeUsage` / `releaseCreditReservation`.
 */
export function creditGate(operation: string, estimatedCostKopecks: bigint) {
	return async ({
		context,
		next,
	}: {
		context: Record<string, unknown>;
		next: (opts?: { context?: Record<string, unknown> }) => Promise<unknown>;
	}) => {
		const protectedCtx = context as unknown as ProtectedContext;
		const idempotencyKey = `credit-gate:${operation}:${randomUUID()}`;

		const walletInfo = await resolveWalletForContext(protectedCtx).catch((err) => {
			logger.error({ err, operation }, "creditGate: failed to resolve wallet");
			return null;
		});

		if (!walletInfo) {
			throw new ORPCError("PAYMENT_REQUIRED", {
				message:
					"No AI wallet found. Please top up your AI credits at /settings/billing/ai-credits.",
			});
		}

		let reservationId: string;
		try {
			const result = await reserveAiCredits({
				walletId: walletInfo.walletId,
				userId: walletInfo.userId,
				organizationId: walletInfo.organizationId,
				operation,
				estimatedKopecks: estimatedCostKopecks,
				idempotencyKey,
			});
			reservationId = result.reservationId;
		} catch (err) {
			if (err instanceof AiWalletInsufficientFundsError) {
				const fundsErr = err as AiWalletInsufficientFundsError;
				throw new ORPCError("PAYMENT_REQUIRED", {
					message: `Insufficient AI credits. Required: ${fundsErr.requiredKopecks} kopecks, available: ${fundsErr.availableKopecks} kopecks. Top up at /settings/billing/ai-credits.`,
				});
			}
			logger.error({ err, operation }, "creditGate: failed to reserve credits");
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to reserve AI credits.",
			});
		}

		return next({
			context: {
				...context,
				creditReservationId: reservationId,
				creditWalletId: walletInfo.walletId,
				creditIdempotencyKey: idempotencyKey,
			},
		});
	};
}

/**
 * Commit a flat-fee AI usage charge after a successful operation.
 * Call this inside the handler after the AI work completes.
 */
export async function commitFlatFeeUsage(
	context: Record<string, unknown>,
	reservationId: string,
	actualCostKopecks: bigint,
): Promise<void> {
	const idempotencyKey =
		(context.creditIdempotencyKey as string | undefined) ??
		`commit-flat-fee:${reservationId}:${randomUUID()}`;

	try {
		await commitAiUsage({
			reservationId,
			idempotencyKey: `${idempotencyKey}:commit`,
			provider: "flat_fee",
			model: "flat_fee",
			pricingRuleId: null,
			promptTokens: 0,
			completionTokens: 0,
			inputCostKopecks: BigInt(0),
			outputCostKopecks: BigInt(0),
			flatFeeKopecks: actualCostKopecks,
			markupBps: 0,
			totalChargeKopecks: actualCostKopecks,
			providerCostUsdMicros: BigInt(0),
			fxRateRubPerUsdMicros: BigInt(0),
			status: "success",
		});
	} catch (err) {
		logger.error({ err, reservationId }, "commitFlatFeeUsage: failed to commit AI usage");
		// Do not re-throw — commit failure should not fail the user request
	}
}

/**
 * Release a credit reservation after an operation failure.
 * Call this inside the catch block of the handler.
 */
export async function releaseCreditReservation(
	context: Record<string, unknown>,
	reservationId: string,
): Promise<void> {
	const idempotencyKey =
		(context.creditIdempotencyKey as string | undefined) ??
		`release:${reservationId}:${randomUUID()}`;

	try {
		await releaseAiReservation({
			reservationId,
			idempotencyKey: `${idempotencyKey}:release`,
			reason: "error",
		});
	} catch (err) {
		logger.error(
			{ err, reservationId },
			"releaseCreditReservation: failed to release reservation",
		);
		// Do not re-throw — release failure should not mask the original error
	}
}
