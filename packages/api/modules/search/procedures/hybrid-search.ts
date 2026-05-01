import { getTypesenseClient, generateEmbedding, formatVectorQuery } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const hitSchema = z.object({
	document: z.record(z.string(), z.unknown()),
	textMatch: z.number().optional(),
	vectorDistance: z.number().optional(),
	hybridScore: z.number().optional(),
});

export const hybridSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/hybrid-search",
		tags: ["Search"],
		summary: "Hybrid search combining keyword and vector",
		description:
			"Performs both a full-text search and a vector similarity search, combining results using Typesense's native hybrid search with a configurable alpha fusion parameter.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(1000),
			queryBy: z.string().optional(),
			vectorField: z.string().default("embedding"),
			k: z.number().int().min(1).max(250).default(10),
			filterBy: z.string().optional(),
			alpha: z.number().min(0).max(1).default(0.5),
			model: z.string().default("text-embedding-3-small"),
		}),
	)
	.output(
		z.object({
			found: z.number(),
			hits: z.array(hitSchema),
			searchTimeMs: z.number(),
			embedding: z.object({
				model: z.string(),
				dimensions: z.number(),
				tokens: z.number(),
			}),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const embedding = await generateEmbedding(input.query, input.model);
		const vectorQuery = formatVectorQuery(embedding.vector, input.vectorField, input.k);

		const client = getTypesenseClient();
		const searchParams: Record<string, unknown> = {
			q: input.query,
			query_by: input.queryBy ?? "title,description",
			vector_query: vectorQuery,
			per_page: input.k,
			hybrid_search: true,
			alpha: input.alpha,
		};

		if (input.filterBy) {
			searchParams.filter_by = input.filterBy;
		}

		const results = (await client
			.collections(index.slug)
			.documents()
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.search(searchParams as any)) as any;

		return {
			found: results.found ?? 0,
			hits: ((results.hits ?? []) as any[]).map((hit: any) => ({
				document: hit.document as Record<string, unknown>,
				textMatch: hit.text_match_info?.score as number | undefined,
				vectorDistance: hit.vector_distance as number | undefined,
				hybridScore: hit._hybrid_score as number | undefined,
			})),
			searchTimeMs: results.search_time_ms ?? 0,
			embedding: {
				model: embedding.model,
				dimensions: embedding.dimensions,
				tokens: embedding.tokens,
			},
		};
	});
