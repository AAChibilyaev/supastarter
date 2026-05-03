import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";

const multiSearchEntrySchema = z.object({
	slug: z.string(),
	query: z.string().min(1).max(1000),
	queryBy: z.string().optional(),
	filterBy: z.string().optional(),
	facetBy: z.string().optional(),
	/** Maximum number of facet values to return per field. */
	maxFacetValues: z.number().int().min(1).optional(),
	/** Filter facet values by a sub-query (autocomplete within facet values). */
	facetQuery: z.string().optional(),
	/** Search across facet values (typeahead within facet values). */
	facetSearch: z.string().optional(),
	/** Percentage of documents to sample for facet counts (0–100). */
	facetSamplePercent: z.number().min(0).max(100).optional(),
	/** Facet strategy: "exact" for exact matches, "intersection" for intersection-based counting. */
	facetStrategy: z.enum(["exact", "intersection"]).optional(),
	/** Per-field facet value sort order (comma-separated). Format: "field_name:count|alpha". */
	facetSortBy: z.string().optional(),
	sortBy: z.string().optional(),
	collection: z.string().optional(),
	groupBy: z.string().optional(),
	groupLimit: z.number().int().min(1).max(100).optional(),
	groupMissingValues: z.boolean().optional(),
	pinnedHits: z.string().optional(),
	/** Per-index weight/boost multiplier for blended results (1.0 = default) */
	weight: z.number().min(0.1).max(10).optional(),
});

export const federatedSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/search/federated",
		tags: ["Search"],
		summary: "Federated multi-search across indexes",
		description:
			"Performs multiple searches across different indexes in one round-trip. Results can be returned separately or merged with duplicate removal. Supports per-index weight for relevance boosting in blended results.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			searches: z.array(multiSearchEntrySchema).min(1).max(10),
			dedup: z.boolean().default(false),
			union: z.boolean().default(false),
			perPage: z.number().int().min(1).max(250).default(20),
		}),
	)
	.output(
		z.object({
			results: z.array(
				z.object({
					slug: z.string(),
					found: z.number(),
					hits: z.array(
						z.object({
							document: z.record(z.string(), z.unknown()),
							weight: z.number().optional(),
						}),
					),
					searchTimeMs: z.number(),
				}),
			),
			union: z
				.array(
					z.object({
						document: z.record(z.string(), z.unknown()),
						weight: z.number().optional(),
						_sourceSlug: z.string().optional(),
					}),
				)
				.optional(),
			totalTimeMs: z.number(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);

		const client = getTypesenseClient();
		const startTime = Date.now();

		const multiSearchParams = await Promise.all(
			input.searches.map(async (s) => {
				const index = await requireSearchIndex(input.organizationId, s.slug);
				return {
					collection: s.collection ?? index.slug,
					q: s.query,
					query_by: s.queryBy ?? "title,description",
					filter_by: s.filterBy ?? "",
					facet_by: s.facetBy ?? "",
					...(s.maxFacetValues !== undefined && {
						max_facet_values: s.maxFacetValues,
					}),
					...(s.facetQuery !== undefined && {
						facet_query: s.facetQuery,
					}),
					...(s.facetSearch !== undefined && {
						facet_search: s.facetSearch,
					}),
					...(s.facetSamplePercent !== undefined && {
						facet_sample_percent: s.facetSamplePercent,
					}),
					...(s.facetStrategy !== undefined && {
						facet_strategy: s.facetStrategy,
					}),
					...(s.facetSortBy !== undefined && {
						facet_sort_by: s.facetSortBy,
					}),
					...(s.sortBy && { sort_by: s.sortBy }),
					...(s.groupBy && { group_by: s.groupBy }),
					...(s.groupLimit !== undefined && { group_limit: s.groupLimit }),
					...(s.groupMissingValues !== undefined && {
						group_missing_values: s.groupMissingValues,
					}),
					...(s.pinnedHits && { pinned_hits: s.pinnedHits }),
				};
			}),
		);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const multiResult = (await (client.multiSearch as any).perform(
			{ searches: multiSearchParams },
			{},
		)) as any;

		const weights = input.searches.map((s) => s.weight ?? 1.0);

		const searchResults = (multiResult?.results ?? []).map((result: any, i: number) => ({
			slug: input.searches[i]!.slug,
			found: result.found ?? 0,
			hits: (result.hits ?? []).map((hit: any) => ({
				document: hit.document as Record<string, unknown>,
				weight: weights[i],
			})),
			searchTimeMs: result.search_time_ms ?? 0,
		}));

		// Build union with dedup if requested — apply per-index weight for blended ordering
		let unionResults:
			| Array<{
					document: Record<string, unknown>;
					weight?: number;
					_sourceSlug?: string;
			  }>
			| undefined;
		if (input.union || input.dedup) {
			const seen = new Set<string>();
			unionResults = [];
			// Collect all hits with their weights
			const weightedHits: Array<{
				document: Record<string, unknown>;
				weight: number;
				slug: string;
			}> = [];
			for (const result of searchResults) {
				for (const hit of result.hits) {
					weightedHits.push({
						document: hit.document,
						weight: hit.weight ?? 1.0,
						slug: result.slug,
					});
				}
			}
			// Sort weighted hits by weight descending (higher weight = higher priority)
			weightedHits.sort((a, b) => b.weight - a.weight);
			// Dedup and build union
			for (const hit of weightedHits) {
				const key = JSON.stringify(hit.document);
				if (!input.dedup || !seen.has(key)) {
					seen.add(key);
					unionResults.push({
						document: hit.document,
						weight: hit.weight,
						_sourceSlug: hit.slug,
					});
				}
			}
			// Trim to requested perPage
			unionResults = unionResults.slice(0, input.perPage);
		}

		return {
			results: searchResults,
			union: unionResults,
			totalTimeMs: Date.now() - startTime,
		};
	});
