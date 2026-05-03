import { tool } from "@repo/ai";
import { z } from "zod";
import { getTypesenseClient } from "@repo/search";
import { logger } from "@repo/logs";
import { type PersonalizationContext, injectPersonalizationIntoSearch } from "../personalization-context";

const inputSchema = z.object({
	query: z.string().describe("Search query — product name, category, or description of what the user needs"),
	filters: z.string().optional().describe("Typesense filter expression, e.g. 'price:<5000 && brand:=Nike'"),
	limit: z.number().int().min(1).max(10).optional().default(5).describe("Number of results to return"),
});

export function createSearchProductsTool(params: {
	indexSlug: string;
	personalizationContext?: PersonalizationContext;
}) {
	return tool({
		description:
			"Search for products in the catalog. Use this to find products matching the user's needs, preferences, budget, and availability.",
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
					})),
				};
			} catch (err) {
				logger.warn({ err, query: input.query, indexSlug: params.indexSlug }, "search_products tool failed");
				return { found: 0, products: [], error: "search_failed" };
			}
		},
	});
}
