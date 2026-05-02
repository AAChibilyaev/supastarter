import { ORPCError } from "@orpc/client";
import { getPurchaseById } from "@repo/database";
import { listPaymentMethods as listPaymentMethodsFn } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const listPaymentMethods = protectedProcedure
	.route({
		method: "GET",
		path: "/payments/payment-methods",
		tags: ["Payments"],
		summary: "List saved payment methods",
		description: "Get all saved card payment methods for a purchase\'s customer.",
	})
	.input(
		z.object({
			purchaseId: z.string(),
		}),
	)
	.handler(async ({ input: { purchaseId }, context: { user } }) => {
		const purchase = await getPurchaseById(purchaseId);

		if (!purchase) {
			throw new ORPCError("NOT_FOUND", {
				message: "Purchase not found",
			});
		}

		// Authorization: user must own the purchase or be an org member
		if (purchase.organizationId) {
			const { getOrganizationMembership } = await import("@repo/database");
			const membership = await getOrganizationMembership(purchase.organizationId, user.id);
			if (!membership) {
				throw new ORPCError("FORBIDDEN");
			}
		} else if (purchase.userId && purchase.userId !== user.id) {
			throw new ORPCError("FORBIDDEN");
		}

		if (!purchase.customerId) {
			return [];
		}

		return listPaymentMethodsFn(purchase.customerId);
	});
