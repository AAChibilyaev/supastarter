import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

// ── Schemas ──────────────────────────────────────────────────────

export const rankingRulesSchema = z.object({
	fieldWeights: z.record(z.string(), z.number().min(1).max(100)).default({}),
	defaultSortingField: z.string().nullable().default(null),
	typoTolerance: z.number().int().min(0).max(4).default(1),
	prefixSearch: z.boolean().default(true),
	infixSearch: z.enum(["off", "fallback", "always"]).default("fallback"),
	exactMatch: z.boolean().default(true),
	customRankingRules: z.array(z.string()).default([]),
});

export type RankingRules = z.infer<typeof rankingRulesSchema>;

const rankingRulesOutput = z.object({
	rankingRules: rankingRulesSchema,
});

// ── Extract ranking config from schema JSON ──────────────────────

function extractRankingRules(schema: unknown): RankingRules {
	if (!schema || typeof schema !== "object") {
		return rankingRulesSchema.parse({});
	}
	const obj = schema as Record<string, unknown>;
	const stored = (obj.ranking ?? {}) as Record<string, unknown>;
	return rankingRulesSchema.parse(stored);
}

// ── Get Ranking Rules ────────────────────────────────────────────

export const getRankingRules = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/ranking-rules",
		tags: ["Search"],
		summary: "Get ranking rules for a search index",
		description:
			"Returns the ranking configuration (field weights, typo tolerance, custom ranking) for the given index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(rankingRulesOutput)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const rankingConfig = extractRankingRules(index.schema);

		return { rankingRules: rankingConfig };
	});

// ── Update Ranking Rules ─────────────────────────────────────────

export const updateRankingRules = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/ranking-rules",
		tags: ["Search"],
		summary: "Update ranking rules for a search index",
		description:
			"Replaces the ranking configuration (field weights, typo tolerance, custom ranking) for the given index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			rankingRules: rankingRulesSchema,
		}),
	)
	.output(rankingRulesOutput)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		// Preserve existing schema fields, only update the ranking key
		const existingSchema =
			index.schema && typeof index.schema === "object"
				? (index.schema as Record<string, unknown>)
				: {};
		const updatedSchema = {
			...existingSchema,
			ranking: input.rankingRules,
		};

		await db.searchIndex.update({
			where: { id: index.id },
			data: { schema: updatedSchema as never },
		});

		return { rankingRules: input.rankingRules };
	});
