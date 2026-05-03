import { ORPCError } from "@orpc/server";
import { getConversation, listConversations } from "@repo/database";
import z from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";

export const getConversationHistoryProcedure = protectedProcedure
	.input(
		z.object({
			organizationId: z.string(),
			conversationId: z.string().optional(),
			limit: z.number().int().min(1).max(100).optional().default(20),
			offset: z.number().int().min(0).optional().default(0),
		}),
	)
	.handler(async ({ input, context }) => {
		const { user } = context;

		await requireOrganizationMember(input.organizationId, user.id);

		if (input.conversationId) {
			const conversation = await getConversation(input.conversationId, input.limit);
			if (!conversation || conversation.organizationId !== input.organizationId) {
				throw new ORPCError("NOT_FOUND");
			}
			return { conversations: [conversation] };
		}

		const conversations = await listConversations(input.organizationId, {
			userId: user.id,
			limit: input.limit,
			offset: input.offset,
		});

		return { conversations };
	});
