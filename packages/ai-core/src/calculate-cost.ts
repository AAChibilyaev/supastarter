import type { CostBreakdown, CostEstimateInput, PricingRuleSnapshot } from "./types";

const ONE_MILLION = BigInt(1_000_000);
const TEN_THOUSAND_BPS = BigInt(10_000); // 100% in basis points

/**
 * Calculate kopecks charge from token counts and a versioned pricing rule.
 *
 * input_cost  = input_tokens  * inputPer1MTokensKopecks  / 1_000_000
 * output_cost = output_tokens * outputPer1MTokensKopecks / 1_000_000
 * raw_cost    = input_cost + output_cost + flatFee
 * customer    = ceil(raw_cost * (1 + markup_bps/10000))
 */
export function calculateCharge(
	input: CostEstimateInput,
	rule: PricingRuleSnapshot,
): CostBreakdown {
	const promptTokens = BigInt(Math.max(0, Math.floor(input.promptTokens)));
	const outputTokens = BigInt(Math.max(0, Math.floor(input.maxOutputTokens)));

	const inputPrice = rule.inputPer1MTokensKopecks ?? rule.embeddingPer1MTokensKopecks ?? BigInt(0);
	const outputPrice = rule.outputPer1MTokensKopecks ?? BigInt(0);

	const inputCost = (promptTokens * inputPrice + ONE_MILLION - BigInt(1)) / ONE_MILLION;
	const outputCost = (outputTokens * outputPrice + ONE_MILLION - BigInt(1)) / ONE_MILLION;
	const flatFee = (input.flatFeeKopecks ?? BigInt(0)) + rule.flatFeeKopecks;

	const rawCost = inputCost + outputCost + flatFee;
	const markupMultiplier = TEN_THOUSAND_BPS + BigInt(rule.markupBps);
	const totalCharge =
		(rawCost * markupMultiplier + TEN_THOUSAND_BPS - BigInt(1)) / TEN_THOUSAND_BPS;

	return {
		inputCostKopecks: inputCost,
		outputCostKopecks: outputCost,
		flatFeeKopecks: flatFee,
		markupBps: rule.markupBps,
		totalChargeKopecks: totalCharge,
		providerCostUsdMicros: BigInt(0), // populated separately if cost was sourced in USD
		fxRateRubPerUsdMicros: BigInt(0),
	};
}
