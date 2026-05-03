import { ORPCError } from "@orpc/client";
import { getOrganizationMembership, getPurchaseById, updatePurchase } from "@repo/database";
import { logger } from "@repo/logs";
import { pauseSubscription as pauseSubscriptionFn } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const pauseSubscription = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/pause-subscription",
		tags: ["Payments"],
		summary: "Pause subscription",
		description: "Pauses a subscription. No charges during the pause period.",
	})
	.input(
		z.object({
			purchaseId: z.string(),
			behavior: z
				.enum(["keep_as_draft", "mark_uncollectible", "void"])
				.default("keep_as_draft"),
		}),
	)
	.handler(async ({ input: { purchaseId, behavior }, context: { user } }) => {
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
			await pauseSubscriptionFn(purchase.subscriptionId, { behavior });

			await updatePurchase({ id: purchase.id, status: "paused" });

			return { success: true };
		} catch (e) {
			logger.error("Could not pause subscription", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
