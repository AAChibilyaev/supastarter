import { ORPCError } from "@orpc/client";
import { getPurchaseById } from "@repo/database";
import { setDefaultPaymentMethod as setDefaultPaymentMethodFn } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const setDefaultPaymentMethod = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/set-default-payment-method",
		tags: ["Payments"],
		summary: "Set default payment method",
		description: "Sets a saved card as the default payment method for the customer.",
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

		// Authorization
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
			throw new ORPCError("BAD_REQUEST", {
				message: "Purchase has no Stripe customer ID",
			});
		}

		await setDefaultPaymentMethodFn(purchase.customerId, paymentMethodId);

		return { success: true };
	});
