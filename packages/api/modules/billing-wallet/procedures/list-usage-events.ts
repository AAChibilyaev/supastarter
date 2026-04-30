import { ORPCError } from "@orpc/client";
import { getAiWalletByEntity, listAiUsageEvents } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { aiUsageEventDtoSchema } from "../types";

export const listUsageEvents = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/ai-wallet/usage",
		tags: ["AI Wallet"],
		summary: "List AI usage events with optional filters",
	})
	.input(
		z.object({
			organizationId: z.string().optional(),
			projectId: z.string().optional(),
			operation: z.string().optional(),
			provider: z.string().optional(),
			model: z.string().optional(),
			from: z.date().optional(),
			to: z.date().optional(),
			limit: z.number().int().min(1).max(200).default(50),
			cursor: z.string().optional(),
		}),
	)
	.output(z.array(aiUsageEventDtoSchema))
	.handler(async ({ input, context: { user } }) => {
		const wallet = await getAiWalletByEntity(
			input.organizationId ? { organizationId: input.organizationId } : { userId: user.id },
		);
		if (!wallet) throw new ORPCError("NOT_FOUND", { message: "Wallet not initialized" });

		return listAiUsageEvents(
			{
				walletId: wallet.id,
				organizationId: input.organizationId,
				projectId: input.projectId,
				operation: input.operation,
				provider: input.provider,
				model: input.model,
				from: input.from,
				to: input.to,
			},
			{ limit: input.limit, cursor: input.cursor },
		);
	});
