import { tool } from "@repo/ai";
import { z } from "zod";

import { type LoyaltyConnector } from "../../connectors/loyalty-connector";

const inputSchema = z.object({
	productId: z
		.string()
		.optional()
		.describe("Product ID to check category-specific discounts for"),
	categoryId: z
		.string()
		.optional()
		.describe("Category ID to check category-specific discounts for"),
});

export function createGetUserConditionsTool(
	loyaltyConnector: LoyaltyConnector,
	sessionUserId?: string,
) {
	return tool({
		description:
			"Get the user's personalized shopping conditions: bonus balance, applicable promo codes, personal discounts, and installment availability. Use this to show the user the best deal available to them.",
		inputSchema,
		execute: async (input) => {
			if (!sessionUserId) {
				return { message: "Войдите в аккаунт, чтобы увидеть персональные условия." };
			}
			return loyaltyConnector.getUserConditions(sessionUserId, {
				productId: input.productId,
				categoryId: input.categoryId,
			});
		},
	});
}
