import { listAiPricingRules } from "@repo/database";

import { protectedProcedure } from "../../../orpc/procedures";

export const listPricingRules = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/credits/pricing-rules",
		tags: ["Credits Analytics"],
		summary: "List current AI pricing rate card",
		description:
			"Returns all active and historical AI pricing rules grouped by provider, model, and operation. Used by the dashboard rate card display.",
	})
	.handler(async () => {
		const rules = await listAiPricingRules();
		return rules.map((r) => ({
			id: r.id,
			provider: r.provider,
			model: r.model,
			operation: r.operation,
			currency: r.currency,
			inputPer1MTokensKopecks: r.inputPer1MTokensKopecks?.toString() ?? null,
			outputPer1MTokensKopecks: r.outputPer1MTokensKopecks?.toString() ?? null,
			embeddingPer1MTokensKopecks: r.embeddingPer1MTokensKopecks?.toString() ?? null,
			flatFeeKopecks: r.flatFeeKopecks.toString(),
			markupBps: r.markupBps,
			effectiveFrom: r.effectiveFrom,
			effectiveTo: r.effectiveTo,
			notes: r.notes,
		}));
	});
