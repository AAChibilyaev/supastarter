import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const hitSchema = z.object({
	document: z.record(z.string(), z.unknown()),
});

const facetCountSchema = z.object({
	value: z.string(),
	count: z.number(),
});

const facetSchema = z.object({
	field: z.string(),
	counts: z.array(facetCountSchema),
});

export const facetSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/facet-search",
		tags: ["Search"],
		summary: "Faceted search with sampling control",
		description:
			"Searches with facet-specific parameters: facet_sample_percent for performance tuning, facet_query for pre-filtered faceting, and facet_query_num_typos for fuzzy facet matching.",
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
			facetSamplePercent: z.number().int().min(1).max(100).optional(),
			facetQuery: z.string().optional(),
			facetQueryNumTypos: z.number().int().min(0).max(2).optional(),
			facetSampleSlope: z.number().min(0).max(1).optional(),
			facetSampleThreshold: z.number().int().min(0).optional(),
			rangeFacets: z
				.array(
					z.object({
						field: z.string(),
						min: z.union([z.number(), z.string()]),
						max: z.union([z.number(), z.string()]),
					}),
				)
				.max(20)
				.optional(),
		}),
	)
	.output(
		z.object({
			found: z.number(),
			hits: z.array(hitSchema),
			facets: z.array(facetSchema),
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
		if (input.facetSamplePercent !== undefined) {
			searchParams.facet_sample_percent = input.facetSamplePercent;
		}
		if (input.facetQuery) searchParams.facet_query = input.facetQuery;
		if (input.facetQueryNumTypos !== undefined) {
			searchParams.facet_query_num_typos = input.facetQueryNumTypos;
		}
		if (input.facetSampleSlope !== undefined) {
			searchParams.facet_sample_slope = input.facetSampleSlope;
		}
		if (input.facetSampleThreshold !== undefined) {
			searchParams.facet_sample_threshold = input.facetSampleThreshold;
		}
		if (input.rangeFacets?.length) {
			searchParams.facet_by = `${searchParams.facet_by ?? ''},${input.rangeFacets.map(r => `${r.field}:range:(${r.min}..${r.max})`).join(',')}`.replace(/^,/, '');
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
			})),
			facets: ((results.facet_counts ?? []) as any[]).map((facet: any) => ({
				field: facet.field_name,
				counts: (facet.counts ?? []) as { value: string; count: number }[],
			})),
			searchTimeMs: results.search_time_ms ?? 0,
			page: results.page ?? input.page,
		};
	});
