import { getTypesenseClient, generateEmbedding, formatVectorQuery } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const hitSchema = z.object({
	document: z.record(z.string(), z.unknown()),
	vectorDistance: z.number().optional(),
});

export const vectorSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/vector-search",
		tags: ["Search"],
		summary: "Vector search across a search index",
		description:
			"Accepts a text query, generates an embedding, then performs a vector similarity search using the Typesense vector_query parameter.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(1000),
			field: z.string().default("embedding"),
			k: z.number().int().min(1).max(250).default(10),
			filterBy: z.string().optional(),
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
		const vectorQuery = formatVectorQuery(embedding.vector, input.field, input.k);

		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const results = await (client
			.collections(index.slug)
			.documents()
			.search({
				q: "*",
				vector_query: vectorQuery,
				filter_by: input.filterBy ?? undefined,
				per_page: input.k,
			}) as any);

		return {
			found: results.found ?? 0,
			hits: ((results.hits ?? []) as any[]).map((hit: any) => ({
				document: hit.document as Record<string, unknown>,
				vectorDistance: hit.vector_distance as number | undefined,
			})),
			searchTimeMs: results.search_time_ms ?? 0,
			embedding: {
				model: embedding.model,
				dimensions: embedding.dimensions,
				tokens: embedding.tokens,
			},
		};
	});
