import { tool } from "@repo/ai";
import { z } from "zod";

import { type OmsConnector } from "../../connectors/oms-connector";

const inputSchema = z.object({
	returnId: z.string().optional().describe("Return request ID if the user has it"),
	orderId: z.string().optional().describe("Original order ID if return ID is not known"),
});

export function createGetReturnStatusTool(omsConnector: OmsConnector, sessionUserId?: string) {
	return tool({
		description:
			"Get the status of a product return request. ALWAYS use this tool — never invent return amounts or dates.",
		inputSchema,
		execute: async (input) => {
			if (!sessionUserId) {
				return {
					error: "authentication_required",
					message: "Для проверки возврата необходимо войти в аккаунт.",
				};
			}
			const id = input.returnId ?? input.orderId ?? "";
			const result = await omsConnector.getReturnStatus(id, sessionUserId);
			if (!result) {
				return {
					error: "not_found",
					message: "Возврат не найден или не принадлежит вашему аккаунту.",
				};
			}
			return result;
		},
	});
}
