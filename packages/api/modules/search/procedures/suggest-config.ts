import { db, type Prisma } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

/**
 * Suggest (autocomplete) configuration stored per-index in SearchIndex.schema JSON.
 */
export const suggestConfigSchema = z.object({
	/** Maximum number of suggestions to return (default: 10) */
	maxResults: z.number().int().min(1).max(50).default(10),
	/** Minimum prefix length to trigger suggestions (default: 2) */
	minPrefix: z.number().int().min(1).max(10).default(2),
	/** Enable fuzzy autocomplete with typo tolerance (default: true) */
	fuzzyEnabled: z.boolean().default(true),
	/** Maximum edit distance for fuzzy suggestions (default: 2) */
	fuzzyDistance: z.number().int().min(1).max(4).default(2),
	/** Which fields to use for prefix suggestions (empty = all string fields) */
	prefixFields: z.array(z.string().min(1)).max(20).optional(),
	/** Enable trending suggestions from last 24h window (default: true) */
	trendingEnabled: z.boolean().default(true),
	/** Trending window in hours (default: 24) */
	trendingWindowHours: z.number().int().min(1).max(168).default(24),
	/** Number of trending suggestions (default: 5) */
	trendingCount: z.number().int().min(1).max(20).default(5),
	/** Enable popular query suggestions from analytics (default: true) */
	popularEnabled: z.boolean().default(true),
	/** Number of popular suggestions (default: 5) */
	popularCount: z.number().int().min(1).max(20).default(5),
	/** Enable per-user recent query suggestions (default: false) */
	recentEnabled: z.boolean().default(false),
	/** Number of recent suggestions per user (default: 5) */
	recentCount: z.number().int().min(1).max(20).default(5),
});

export type SuggestConfig = z.infer<typeof suggestConfigSchema>;

export const DEFAULT_SUGGEST_CONFIG: SuggestConfig = {
	maxResults: 10,
	minPrefix: 2,
	fuzzyEnabled: true,
	fuzzyDistance: 2,
	prefixFields: undefined,
	trendingEnabled: true,
	trendingWindowHours: 24,
	trendingCount: 5,
	popularEnabled: true,
	popularCount: 5,
	recentEnabled: false,
	recentCount: 5,
};

export const getSuggestConfig = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/suggest-config",
		tags: ["Search"],
		summary: "Get suggest/autocomplete config for a search index",
		description:
			"Returns the per-index suggest configuration (prefix matching, fuzzy mode, trending, popular).",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(suggestConfigSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const schema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};

		const raw = (schema as Record<string, unknown>)._suggestConfig;
		if (raw && typeof raw === "object") {
			const parsed = suggestConfigSchema.safeParse(raw);
			if (parsed.success) return parsed.data;
		}

		return { ...DEFAULT_SUGGEST_CONFIG };
	});

export const updateSuggestConfig = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/suggest-config",
		tags: ["Search"],
		summary: "Update suggest/autocomplete config for a search index",
		description: "Replaces the entire suggest configuration for the index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			config: suggestConfigSchema,
		}),
	)
	.output(suggestConfigSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const schema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};

		await db.searchIndex.update({
			where: { id: index.id },
			data: {
				schema: {
					...schema,
					_suggestConfig: input.config,
				} as Prisma.InputJsonValue,
			},
		});

		return input.config;
	});
