import { tool } from "@repo/ai";
import { z } from "zod";

import { type OmsConnector } from "../../connectors/oms-connector";

const inputSchema = z.object({
	orderId: z.string().describe("Order ID or order number provided by the user"),
});

export function createGetOrderStatusTool(omsConnector: OmsConnector, sessionUserId?: string) {
	return tool({
		description:
			"Get the current status of a customer order. ALWAYS use this tool for order status questions — never guess or make up order information.",
		inputSchema,
		execute: async (input) => {
			if (!sessionUserId) {
				return {
					error: "authentication_required",
					message: "Для проверки заказа необходимо войти в аккаунт.",
				};
			}
			const result = await omsConnector.getOrderStatus(input.orderId, sessionUserId);
			if (!result) {
				return {
					error: "not_found",
					message: "Заказ не найден или не принадлежит вашему аккаунту.",
				};
			}
			return result;
		},
	});
}
