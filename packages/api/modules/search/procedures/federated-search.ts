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
	sortBy: z.string().optional(),
	collection: z.string().optional(),
	groupBy: z.string().optional(),
	groupLimit: z.number().int().min(1).max(100).optional(),
	groupMissingValues: z.boolean().optional(),
	pinnedHits: z.string().optional(),
});

export const federatedSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/search/federated",
		tags: ["Search"],
		summary: "Federated multi-search across indexes",
		description:
			"Performs multiple searches across different indexes in one round-trip. Results can be returned separately or merged with duplicate removal.",
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
						}),
					),
					searchTimeMs: z.number(),
				}),
			),
			union: z
				.array(
					z.object({
						document: z.record(z.string(), z.unknown()),
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

		const searchResults = (multiResult?.results ?? []).map((result: any, i: number) => ({
			slug: input.searches[i]!.slug,
			found: result.found ?? 0,
			hits: (result.hits ?? []).map((hit: any) => ({
				document: hit.document as Record<string, unknown>,
			})),
			searchTimeMs: result.search_time_ms ?? 0,
		}));

		// Build union with dedup if requested
		let unionResults: Array<{ document: Record<string, unknown> }> | undefined;
		if (input.union || input.dedup) {
			const seen = new Set<string>();
			unionResults = [];
			for (const result of searchResults) {
				for (const hit of result.hits) {
					const key = JSON.stringify(hit.document);
					if (!input.dedup || !seen.has(key)) {
						seen.add(key);
						unionResults.push({ document: hit.document });
					}
				}
			}
		}

		return {
			results: searchResults,
			union: unionResults,
			totalTimeMs: Date.now() - startTime,
		};
	});
