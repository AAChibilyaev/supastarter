import { ORPCError } from "@orpc/client";
import { getPurchaseById } from "@repo/database";
import { detachPaymentMethod as detachPaymentMethodFn } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const detachPaymentMethod = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/detach-payment-method",
		tags: ["Payments"],
		summary: "Detach a saved payment method",
		description: "Remove a saved card payment method from the customer.",
	})
	.input(
		z.object({
			purchaseId: z.string(),
			paymentMethodId: z.string(),
		}),
	)
	.handler(async ({ input: { purchaseId, paymentMethodId }, context: { user } }) => {
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

		await detachPaymentMethodFn(paymentMethodId);

		return { success: true };
	});
