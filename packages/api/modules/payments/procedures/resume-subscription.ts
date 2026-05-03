import { ORPCError } from "@orpc/client";
import { getOrganizationMembership, getPurchaseById, updatePurchase } from "@repo/database";
import { logger } from "@repo/logs";
import { resumeSubscription as resumeSubscriptionFn } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const resumeSubscription = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/resume-subscription",
		tags: ["Payments"],
		summary: "Resume subscription",
		description: "Resumes a paused or cancel-at-period-end subscription.",
	})
	.input(
		z.object({
			purchaseId: z.string(),
		}),
	)
	.handler(async ({ input: { purchaseId }, context: { user } }) => {
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
			await resumeSubscriptionFn(purchase.subscriptionId);

			// Recalculate status: could be "cancel_at_period_end" → "active" or "paused" → "active"
			await updatePurchase({ id: purchase.id, status: "active" });

			return { success: true };
		} catch (e) {
			logger.error("Could not resume subscription", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
