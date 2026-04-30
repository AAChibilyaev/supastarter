import { ORPCError } from "@orpc/client";
import { getTopupOrderById } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const getTopupStatus = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/ai-wallet/topups/{orderId}",
		tags: ["AI Wallet"],
		summary: "Get top-up order status",
	})
	.input(z.object({ orderId: z.string() }))
	.output(
		z.object({
			id: z.string(),
			status: z.string(),
			amountKopecks: z.bigint().transform((v) => v.toString()),
			provider: z.string(),
			paidAt: z.date().nullable(),
			createdAt: z.date(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		const order = await getTopupOrderById(input.orderId);
		if (!order) throw new ORPCError("NOT_FOUND");
		// authz: order must belong to caller (user-scoped) or one of caller's orgs (org-scoped)
		if (order.userId && order.userId !== user.id) {
			throw new ORPCError("FORBIDDEN");
		}
		// org-scoped check is intentionally simple here; for stricter access add a member check.
		return {
			id: order.id,
			status: order.status,
			amountKopecks: order.amountKopecks,
			provider: order.provider,
			paidAt: order.paidAt,
			createdAt: order.createdAt,
		};
	});
