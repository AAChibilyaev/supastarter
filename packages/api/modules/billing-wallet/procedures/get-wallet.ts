import { getAiWalletByEntity } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { aiWalletDtoSchema } from "../types";

export const getWallet = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/ai-wallet",
		tags: ["AI Wallet"],
		summary: "Get current AI wallet",
		description:
			"Returns the AI wallet for the current user OR the provided organization (XOR). Returns null if not initialized.",
	})
	.input(z.object({ organizationId: z.string().optional() }))
	.output(aiWalletDtoSchema.nullable())
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		const wallet = await getAiWalletByEntity(
			organizationId ? { organizationId } : { userId: user.id },
		);
		return wallet;
	});
