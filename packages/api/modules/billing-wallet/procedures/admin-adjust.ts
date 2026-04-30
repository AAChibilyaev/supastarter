import { adminAdjustWallet } from "@repo/billing-wallet";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";
import { adminAdjustInputSchema } from "../types";

export const adminAdjust = adminProcedure
	.route({
		method: "POST",
		path: "/billing/ai-wallet/admin/adjust",
		tags: ["AI Wallet", "Admin"],
		summary: "Manual wallet credit/debit (admin only)",
	})
	.input(adminAdjustInputSchema)
	.output(z.object({ newBalanceKopecks: z.bigint().transform((v) => v.toString()) }))
	.handler(async ({ input, context: { user } }) => {
		const newBalance = await adminAdjustWallet({
			walletId: input.walletId,
			amountKopecks: input.amountKopecks,
			direction: input.direction,
			reason: input.reason,
			adminUserId: user.id,
		});
		return { newBalanceKopecks: newBalance };
	});
