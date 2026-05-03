import { ORPCError } from "@orpc/client";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";
import { chargeSubscription } from "../lib/tochka";

export const chargeSubscriptionProcedure = adminProcedure
	.route({
		method: "POST",
		path: "/billing/ai-wallet/subscriptions/charge",
		tags: ["AI Wallet", "Admin"],
		summary: "Charge an existing Tochka subscription (recurring)",
	})
	.input(
		z.object({
			operationId: z.string(),
			amountKopecks: z.coerce.bigint().min(BigInt(1)),
		}),
	)
	.output(
		z.object({
			status: z.string().optional(),
			operationId: z.string().optional(),
		}),
	)
	.handler(async ({ input }) => {
		try {
			const result = (await chargeSubscription(input.operationId, input.amountKopecks)) as {
				status?: string;
				operationId?: string;
			};

			return {
				status: result.status,
				operationId: result.operationId,
			};
		} catch (error) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: `Tochka charge failed: ${(error as Error).message}`,
			});
		}
	});
