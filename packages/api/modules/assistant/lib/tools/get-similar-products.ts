import { tool } from "@repo/ai";
import { logger } from "@repo/logs";
import { z } from "zod";

const inputSchema = z.object({
	productId: z.string().describe("Product ID to find similar items for"),
	limit: z.number().int().min(1).max(8).optional().default(4),
});

export function createGetSimilarProductsTool(params: {
	organizationId: string;
	neo4jQuery?: (
		cypher: string,
		params: Record<string, unknown>,
	) => Promise<{ records: Array<Record<string, unknown>> }>;
}) {
	return tool({
		description:
			"Get similar products and 'frequently bought together' recommendations. Use for cross-sell suggestions and product alternatives.",
		inputSchema,
		execute: async (input) => {
			try {
				if (!params.neo4jQuery) {
					return { results: [], message: "Recommendations not available" };
				}

				const result = await params.neo4jQuery(
					`MATCH (p:Product {id: $productId})-[:SIMILAR_TO|FREQUENTLY_BOUGHT_WITH]->(rec:Product)
					 WHERE rec.organizationId = $organizationId
					 RETURN rec.id as id, rec.title as title, rec.price as price, rec.imageUrl as imageUrl
					 LIMIT $limit`,
					{
						productId: input.productId,
						organizationId: params.organizationId,
						limit: input.limit ?? 4,
					},
				);

				return {
					results: result.records.map((r) => ({
						id: r.id,
						title: r.title,
						price: r.price,
						imageUrl: r.imageUrl,
					})),
				};
			} catch (err) {
				logger.warn({ err, productId: input.productId }, "get_similar_products failed");
				return { results: [] };
			}
		},
	});
}
