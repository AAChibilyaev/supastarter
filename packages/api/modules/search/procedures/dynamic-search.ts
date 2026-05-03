import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const hitSchema = z.object({
	document: z.record(z.string(), z.unknown()),
	textMatch: z.string().optional(),
	geoDistanceMeters: z.number().optional(),
});

export const dynamicSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/dynamic-search",
		tags: ["Search"],
		summary: "Dynamic search with sorting and diversification",
		description:
			"Advanced search supporting dynamic sort fields, diversification parameters, and multi-field relevance tuning.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(0).max(2000).default("*"),
			queryBy: z.string().default("title,description"),
			perPage: z.number().int().min(1).max(250).default(20),
			page: z.number().int().min(1).default(1),
			filterBy: z.string().optional(),
			facetBy: z.string().optional(),
			sortBy: z.string().optional(),
			diversifyField: z.string().optional(),
			diversifyMaxPerValue: z.number().int().min(1).max(250).default(3),
			maxCandidates: z.number().int().min(1).max(10_000).optional(),
			highlightFields: z.string().optional(),
		}),
	)
	.output(
		z.object({
			found: z.number(),
			hits: z.array(hitSchema),
			facets: z.array(
				z.object({
					field: z.string(),
					counts: z.array(
						z.object({
							value: z.string(),
							count: z.number(),
						}),
					),
				}),
			),
			searchTimeMs: z.number(),
			page: z.number(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();

		const searchParams: Record<string, unknown> = {
			q: input.query,
			query_by: input.queryBy,
			per_page: input.perPage,
			page: input.page,
		};

		if (input.filterBy) searchParams.filter_by = input.filterBy;
		if (input.facetBy) searchParams.facet_by = input.facetBy;
		if (input.sortBy) searchParams.sort_by = input.sortBy;
		if (input.highlightFields) {
			searchParams.highlight_fields = input.highlightFields;
		}
		if (input.diversifyField) {
			searchParams.sort_by = input.sortBy ? `${input.sortBy},_text_match:desc` : "_text_match:desc";
			searchParams.include_fields = `${
				input.diversifyField
			}(max_per_value:${input.diversifyMaxPerValue})`;
		}
		if (input.maxCandidates) {
			searchParams.max_candidates = input.maxCandidates;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const results = (await client
			.collections(index.slug)
			.documents()
			.search(searchParams as any)) as any;

		return {
			found: results.found ?? 0,
			hits: ((results.hits ?? []) as any[]).map((hit: any) => ({
				document: hit.document as Record<string, unknown>,
				textMatch: hit.text_match as string | undefined,
				geoDistanceMeters: hit.geo_distance_meters as number | undefined,
			})),
			facets: ((results.facet_counts ?? []) as any[]).map((facet: any) => ({
				field: facet.field_name,
				counts: (facet.counts ?? []) as { value: string; count: number }[],
			})),
			searchTimeMs: results.search_time_ms ?? 0,
			page: results.page ?? input.page,
		};
	});
