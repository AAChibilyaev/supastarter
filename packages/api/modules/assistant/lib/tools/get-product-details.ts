import { tool } from "@repo/ai";
import { logger } from "@repo/logs";
import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

const inputSchema = z.object({
	productId: z.string().describe("Product ID to get details for"),
	aspectsNeeded: z
		.array(z.string())
		.optional()
		.describe("Specific aspects needed, e.g. ['size_guide', 'materials', 'use_cases']"),
});

export function createGetProductDetailsTool(params: {
	indexSlug: string;
	knowledgeSpaceId?: string;
}) {
	return tool({
		description:
			"Get detailed information about a specific product: full specifications, materials, use cases, size guide, and expert notes. Use this for detailed product questions and size help.",
		inputSchema,
		execute: async (input) => {
			try {
				const client = getTypesenseClient();
				const doc = (await client
					.collections(params.indexSlug)
					.documents(input.productId)
					.retrieve()) as Record<string, unknown>;

				return {
					id: doc.id,
					title: doc.title,
					description: doc.description,
					price: doc.price,
					brand: doc.brand,
					category: doc.category,
					attributes: doc.attributes ?? doc.specs ?? {},
					materials: doc.materials ?? doc.composition,
					sizeGuide: doc.size_guide ?? doc.sizeGuide,
					useCase: doc.use_case ?? doc.useCase ?? doc.scenario,
					stock: doc.stock,
					sizesAvailable: doc.sizes_available,
					imageUrl: doc.image_url ?? doc.imageUrl,
					url: doc.url ?? doc.product_url,
				};
			} catch (err) {
				logger.warn({ err, productId: input.productId }, "get_product_details failed");
				return { error: "not_found", productId: input.productId };
			}
		},
	});
}
