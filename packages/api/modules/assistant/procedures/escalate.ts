import { ORPCError } from "@orpc/server";
import { getConversation } from "@repo/database";
import z from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";
import { createEscalationService } from "../lib/escalation/escalation-service";

export const escalateProcedure = protectedProcedure
	.input(
		z.object({
			conversationId: z.string(),
			reason: z.string(),
			urgency: z.enum(["normal", "high"]).optional().default("normal"),
		}),
	)
	.handler(async ({ input, context }) => {
		const { user } = context;

		const conversation = await getConversation(input.conversationId, 5);
		if (!conversation) {
			throw new ORPCError("NOT_FOUND");
		}

		await requireOrganizationMember(conversation.organizationId, user.id);

		const escalationService = createEscalationService({});

		const result = await escalationService.createTicket({
			conversationId: input.conversationId,
			reason: input.reason,
			urgency: input.urgency,
			organizationId: conversation.organizationId,
		});

		return result;
	});
