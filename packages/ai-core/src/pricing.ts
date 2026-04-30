import { getActiveAiPricingRule } from "@repo/database";

import type { AiOperation, AiProvider, PricingRuleSnapshot } from "./types";

export class AiPricingNotFoundError extends Error {
	readonly code = "AI_PRICING_NOT_FOUND" as const;
	constructor(provider: AiProvider, model: string, operation: AiOperation) {
		super(`No active AI pricing rule for ${provider}/${model}/${operation}`);
		this.name = "AiPricingNotFoundError";
	}
}

export async function getActivePricing(input: {
	provider: AiProvider;
	model: string;
	operation: AiOperation;
	at?: Date;
}): Promise<PricingRuleSnapshot> {
	const row = await getActiveAiPricingRule(input);
	if (!row) {
		throw new AiPricingNotFoundError(input.provider, input.model, input.operation);
	}
	return {
		id: row.id,
		provider: row.provider,
		model: row.model,
		operation: row.operation as AiOperation,
		currency: row.currency as "RUB",
		inputPer1MTokensKopecks: row.inputPer1MTokensKopecks,
		outputPer1MTokensKopecks: row.outputPer1MTokensKopecks,
		embeddingPer1MTokensKopecks: row.embeddingPer1MTokensKopecks,
		flatFeeKopecks: row.flatFeeKopecks,
		markupBps: row.markupBps,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
	};
}
