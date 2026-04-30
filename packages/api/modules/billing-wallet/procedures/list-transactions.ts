import { getAiWalletByEntity, listAiWalletTransactions } from "@repo/database";
import { ORPCError } from "@orpc/client";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { aiWalletTransactionDtoSchema } from "../types";

export const listTransactions = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/ai-wallet/transactions",
		tags: ["AI Wallet"],
		summary: "List wallet ledger transactions",
	})
	.input(
		z.object({
			organizationId: z.string().optional(),
			limit: z.number().int().min(1).max(200).default(50),
			cursor: z.string().optional(),
		}),
	)
	.output(z.array(aiWalletTransactionDtoSchema))
	.handler(async ({ input, context: { user } }) => {
		const wallet = await getAiWalletByEntity(
			input.organizationId ? { organizationId: input.organizationId } : { userId: user.id },
		);
		if (!wallet) throw new ORPCError("NOT_FOUND", { message: "Wallet not initialized" });

		return listAiWalletTransactions(wallet.id, { limit: input.limit, cursor: input.cursor });
	});
