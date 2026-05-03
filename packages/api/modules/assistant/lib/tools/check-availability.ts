import { tool } from "@repo/ai";
import { z } from "zod";

import { type InventoryConnector } from "../../connectors/inventory-connector";

const inputSchema = z.object({
	productId: z.string().describe("Product ID to check"),
	size: z.string().optional().describe("Requested size (e.g. '42', 'M', 'L')"),
	color: z.string().optional().describe("Requested color"),
	region: z.string().optional().describe("Delivery region or city"),
});

export function createCheckAvailabilityTool(inventoryConnector: InventoryConnector) {
	return tool({
		description:
			"Check if a specific product is available in the requested size, color, and region. Use this before recommending a product to confirm it can actually be purchased.",
		inputSchema,
		execute: async (input) => {
			return inventoryConnector.getAvailability(
				input.productId,
				input.size,
				input.color,
				input.region,
			);
		},
	});
}
