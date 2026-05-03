import { tool } from "@repo/ai";
import { z } from "zod";

export interface EscalationService {
	createTicket(params: {
		conversationId: string;
		reason: string;
		urgency: "normal" | "high";
		organizationId: string;
	}): Promise<{ ticketId: string; estimatedWaitTime?: string }>;
}

const inputSchema = z.object({
	reason: z.string().describe("Brief reason for escalation, e.g. 'User dissatisfied with order resolution'"),
	urgency: z.enum(["normal", "high"]).optional().default("normal"),
});

export function createEscalateToOperatorTool(params: {
	conversationId: string;
	organizationId: string;
	escalationService: EscalationService;
}) {
	return tool({
		description:
			"Transfer the conversation to a live customer service agent. Use this when the user explicitly requests a human agent, or when the user has expressed dissatisfaction twice in this conversation.",
		inputSchema,
		execute: async (input) => {
			const result = await params.escalationService.createTicket({
				conversationId: params.conversationId,
				reason: input.reason,
				urgency: input.urgency ?? "normal",
				organizationId: params.organizationId,
			});
			return {
				success: true,
				ticketId: result.ticketId,
				estimatedWaitTime: result.estimatedWaitTime ?? "несколько минут",
				message: `Ваш запрос передан оператору. Номер обращения: ${result.ticketId}. Ожидайте ответа в течение ${result.estimatedWaitTime ?? "нескольких минут"}.`,
			};
		},
	});
}
