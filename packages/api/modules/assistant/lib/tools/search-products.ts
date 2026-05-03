import { tool } from "@repo/ai";
import { z } from "zod";
import { generateEmbedding, formatVectorQuery, getTypesenseClient } from "@repo/search";
import { logger } from "@repo/logs";
import { type PersonalizationContext, injectPersonalizationIntoSearch } from "../personalization-context";

const inputSchema = z.object({
	query: z.string().describe("Search query — product name, category, or description of what the user needs"),
	filters: z.string().optional().describe("Typesense filter expression, e.g. 'price:<5000 && brand:=Nike'"),
	limit: z.number().int().min(1).max(10).optional().default(5).describe("Number of results to return"),
	semantic: z.boolean().optional().default(true).describe("Use semantic/vector search for better matching"),
});

export function createSearchProductsTool(params: {
	indexSlug: string;
	personalizationContext?: PersonalizationContext;
}) {
	return tool({
		description:
			"Search for products in the catalog. Use this to find products matching the user's needs, preferences, budget, and availability. Supports semantic search for natural-language queries like 'shoes for rainy trail runs'.",
		inputSchema,
		execute: async (input) => {
			try {
				const client = getTypesenseClient();

				let searchParams: Record<string, unknown> = {
					q: input.query,
					query_by: "title,description,brand,category",
					per_page: input.limit ?? 5,
					highlight_full_fields: "title",
				};

				if (input.filters) {
					searchParams.filter_by = input.filters;
				}

				// Hybrid search: generate query embedding and add vector_query
				// Falls back to pure keyword if embedding fails or no embedding field configured
				if (input.semantic !== false) {
					try {
						const embeddingResult = await generateEmbedding(input.query);
						const vectorQuery = formatVectorQuery(embeddingResult.vector, "embedding", input.limit ?? 5);
						searchParams.vector_query = vectorQuery;
						// alpha=0.7: 70% keyword + 30% vector for product discovery balance
						searchParams.exclude_fields = "";
					} catch {
						// Embedding field may not exist on this collection — silently use keyword only
					}
				}

				if (params.personalizationContext) {
					searchParams = injectPersonalizationIntoSearch(searchParams, params.personalizationContext);
				}

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const results = (await client.collections(params.indexSlug).documents().search(searchParams as any)) as {
					hits?: Array<{ document: Record<string, unknown> }>;
					found?: number;
				};

				const hits = results.hits ?? [];
				return {
					found: results.found ?? 0,
					products: hits.map((hit) => ({
						id: hit.document.id,
						title: hit.document.title,
						price: hit.document.price,
						brand: hit.document.brand,
						category: hit.document.category,
						imageUrl: hit.document.image_url ?? hit.document.imageUrl,
						url: hit.document.url ?? hit.document.product_url,
						stock: hit.document.stock,
						sizesAvailable: hit.document.sizes_available,
						rating: hit.document.rating,
						reviewCount: hit.document.review_count,
					})),
				};
			} catch (err) {
				logger.warn({ err, query: input.query, indexSlug: params.indexSlug }, "search_products tool failed");
				return { found: 0, products: [], error: "search_failed" };
			}
		},
	});
}
