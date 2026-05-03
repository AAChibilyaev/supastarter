import { ORPCError } from "@orpc/server";
import { getConversation, resolveConversation } from "@repo/database";
import z from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";

export const resolveConversationProcedure = protectedProcedure
	.input(z.object({ conversationId: z.string() }))
	.handler(async ({ input, context }) => {
		const { user } = context;

		const conversation = await getConversation(input.conversationId, 0);
		if (!conversation) {
			throw new ORPCError("NOT_FOUND");
		}

		await requireOrganizationMember(conversation.organizationId, user.id);

		await resolveConversation(input.conversationId);

		return { success: true };
	});
