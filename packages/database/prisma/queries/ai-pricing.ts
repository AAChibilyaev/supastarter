import { db } from "../client";

export interface PricingLookup {
	provider: string;
	model: string;
	operation: string;
	at?: Date;
}

export async function getActiveAiPricingRule(input: PricingLookup) {
	const at = input.at ?? new Date();
	return db.aiPricingRule.findFirst({
		where: {
			provider: input.provider,
			model: input.model,
			operation: input.operation,
			effectiveFrom: { lte: at },
			OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
		},
		orderBy: { effectiveFrom: "desc" },
	});
}

export async function listAiPricingRules() {
	return db.aiPricingRule.findMany({
		orderBy: [{ provider: "asc" }, { model: "asc" }, { operation: "asc" }, { effectiveFrom: "desc" }],
	});
}
