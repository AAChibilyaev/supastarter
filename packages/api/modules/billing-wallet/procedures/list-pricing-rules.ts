import { listAiPricingRules } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { pricingRuleDtoSchema } from "../types";

export const listPricingRules = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/credits/pricing-rules",
		tags: ["Credits Analytics"],
		summary: "List current AI pricing rate card",
		description:
			"Returns all active and historical AI pricing rules grouped by provider, model, and operation. Used by the dashboard rate card display.",
	})
	.output(z.array(pricingRuleDtoSchema))
	.handler(async () => {
		const rules = await listAiPricingRules();
		return rules.map((r) => ({
			id: r.id,
			provider: r.provider,
			model: r.model,
			operation: r.operation,
			currency: r.currency,
			inputPer1MTokensKopecks: r.inputPer1MTokensKopecks,
			outputPer1MTokensKopecks: r.outputPer1MTokensKopecks,
			embeddingPer1MTokensKopecks: r.embeddingPer1MTokensKopecks,
			flatFeeKopecks: r.flatFeeKopecks,
			markupBps: r.markupBps,
			effectiveFrom: r.effectiveFrom,
			effectiveTo: r.effectiveTo,
			notes: r.notes,
		}));
	});
