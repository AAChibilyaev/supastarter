import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const highlightSchema = z.object({
	field: z.string(),
	snippet: z.string(),
});

const hitSchema = z.object({
	document: z.record(z.string(), z.unknown()),
	highlights: z.array(highlightSchema).optional(),
});

const facetCountSchema = z.object({
	value: z.string(),
	count: z.number(),
});

const facetSchema = z.object({
	field: z.string(),
	counts: z.array(facetCountSchema),
});

export const semanticSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/semantic-search",
		tags: ["Search"],
		summary: "Natural language / semantic search",
		description:
			"Submits a natural language query. Supports faceting, filtering, highlighting.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(2000),
			queryBy: z.string().optional(),
			perPage: z.number().int().min(1).max(250).default(20),
			filterBy: z.string().optional(),
			facetBy: z.string().optional(),
			sortBy: z.string().optional(),
			highlightFields: z.string().optional(),
		}),
	)
	.output(
		z.object({
			found: z.number(),
			hits: z.array(hitSchema),
			facets: z.array(facetSchema),
			searchTimeMs: z.number(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();
		const searchParams: Record<string, unknown> = {
			q: input.query,
			query_by: input.queryBy ?? "title,description",
			per_page: input.perPage,
		};

		if (input.filterBy) searchParams.filter_by = input.filterBy;
		if (input.facetBy) searchParams.facet_by = input.facetBy;
		if (input.sortBy) searchParams.sort_by = input.sortBy;
		if (input.highlightFields) {
			searchParams.highlight_fields = input.highlightFields;
			searchParams.highlight_full_fields = input.highlightFields;
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
				highlights: hit.highlights
					? Object.entries(hit.highlights as Record<string, unknown>).map(
							([field, snippet]) => ({
								field,
								snippet: Array.isArray(snippet)
									? String(snippet.join(" "))
									: String(snippet),
							}),
						)
					: undefined,
			})),
			facets: ((results.facet_counts ?? []) as any[]).map((facet: any) => ({
				field: facet.field_name,
				counts: (facet.counts ?? []) as { value: string; count: number }[],
			})),
			searchTimeMs: results.search_time_ms ?? 0,
		};
	});
