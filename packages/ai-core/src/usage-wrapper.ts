import {
	AiWalletInsufficientFundsError,
	commitAiUsage,
	releaseAiReservation,
	reserveAiCredits,
} from "@repo/billing-wallet";

import { calculateCharge } from "./calculate-cost";
import { getActivePricing } from "./pricing";
import type { AiCallContext, CostEstimateInput } from "./types";

export interface AiCallResult<T> {
	result: T;
	promptTokens: number;
	completionTokens: number;
	providerCostUsdMicros?: bigint;
	fxRateRubPerUsdMicros?: bigint;
	status?: "success" | "error" | "partial";
}

/**
 * Wraps an AI provider call with the reserve → execute → commit/release flow.
 *
 * Caller responsibilities:
 *   - Provide `estimate` (promptTokens, maxOutputTokens) BEFORE the call.
 *   - In `run()`, return actual token counts read from the provider response
 *     (e.g. `result.usage.promptTokens` from Vercel AI SDK `streamText.onFinish`).
 *   - For streaming, await the stream's `onFinish` before resolving.
 *
 * On insufficient funds: throws `AiWalletInsufficientFundsError`. The caller
 * should map this to HTTP 402 with `topup_url`.
 */
export async function withAiBilling<T>(
	ctx: AiCallContext,
	estimate: CostEstimateInput,
	run: () => Promise<AiCallResult<T>>,
): Promise<T> {
	const rule = await getActivePricing({
		provider: ctx.provider,
		model: ctx.model,
		operation: ctx.operation,
	});

	const estimated = calculateCharge(
		{
			promptTokens: estimate.promptTokens,
			maxOutputTokens: estimate.maxOutputTokens,
			flatFeeKopecks: estimate.flatFeeKopecks ?? ctx.flatFeeKopecks,
		},
		rule,
	);

	const reservation = await reserveAiCredits({
		walletId: ctx.walletId,
		userId: ctx.userId,
		organizationId: ctx.organizationId,
		projectId: ctx.projectId,
		apiKeyId: ctx.apiKeyId,
		operation: ctx.operation,
		estimatedKopecks: estimated.totalChargeKopecks,
		idempotencyKey: `${ctx.idempotencyKey}:reserve`,
		metadata: {
			provider: ctx.provider,
			model: ctx.model,
			requestId: ctx.requestId,
			pricingRuleId: rule.id,
		},
	});

	let outcome: AiCallResult<T>;
	try {
		outcome = await run();
	} catch (err) {
		await releaseAiReservation({
			reservationId: reservation.reservationId,
			idempotencyKey: `${ctx.idempotencyKey}:release`,
			reason: "error",
		});
		throw err;
	}

	const actual = calculateCharge(
		{
			promptTokens: outcome.promptTokens,
			maxOutputTokens: outcome.completionTokens,
			flatFeeKopecks: estimate.flatFeeKopecks ?? ctx.flatFeeKopecks,
		},
		rule,
	);

	await commitAiUsage({
		reservationId: reservation.reservationId,
		idempotencyKey: `${ctx.idempotencyKey}:commit`,
		provider: ctx.provider,
		model: ctx.model,
		pricingRuleId: rule.id,
		promptTokens: outcome.promptTokens,
		completionTokens: outcome.completionTokens,
		inputCostKopecks: actual.inputCostKopecks,
		outputCostKopecks: actual.outputCostKopecks,
		flatFeeKopecks: actual.flatFeeKopecks,
		markupBps: actual.markupBps,
		totalChargeKopecks: actual.totalChargeKopecks,
		providerCostUsdMicros: outcome.providerCostUsdMicros ?? BigInt(0),
		fxRateRubPerUsdMicros: outcome.fxRateRubPerUsdMicros ?? BigInt(0),
		requestId: ctx.requestId,
		status: outcome.status ?? "success",
	});

	return outcome.result;
}

export { AiWalletInsufficientFundsError };
