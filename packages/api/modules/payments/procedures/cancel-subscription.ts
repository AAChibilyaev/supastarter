import { ORPCError } from "@orpc/client";
import { getOrganizationMembership, getPurchaseById, updatePurchase } from "@repo/database";
import { logger } from "@repo/logs";
import { cancelSubscription as cancelSubscriptionFn } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const cancelSubscription = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/cancel-subscription",
		tags: ["Payments"],
		summary: "Cancel subscription",
		description:
			"Cancels a subscription immediately or schedules cancellation at the end of the current billing period",
	})
	.input(
		z.object({
			purchaseId: z.string(),
			mode: z.enum(["immediate", "cancel_at_period_end"]).default("cancel_at_period_end"),
		}),
	)
	.handler(async ({ input: { purchaseId, mode }, context: { user } }) => {
		const purchase = await getPurchaseById(purchaseId);

		if (!purchase) {
			throw new ORPCError("NOT_FOUND");
		}

		if (purchase.organizationId) {
			const membership = await getOrganizationMembership(purchase.organizationId, user.id);
			if (membership?.role !== "owner") {
				throw new ORPCError("FORBIDDEN");
			}
		}

		if (purchase.userId && purchase.userId !== user.id) {
			throw new ORPCError("FORBIDDEN");
		}

		if (!purchase.subscriptionId) {
			throw new ORPCError("BAD_REQUEST");
		}

		try {
			await cancelSubscriptionFn(purchase.subscriptionId, { mode });

			if (mode === "cancel_at_period_end") {
				await updatePurchase({ id: purchase.id, status: "canceling" });
			}

			return { success: true };
		} catch (e) {
			logger.error("Could not cancel subscription", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
