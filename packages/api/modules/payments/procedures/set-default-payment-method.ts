import { ORPCError } from "@orpc/client";
import { getOrganizationById, getUserById } from "@repo/database";
import { logger } from "@repo/logs";
import { getStripeClient } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const setDefaultPaymentMethod = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/payment-methods/set-default",
		tags: ["Payments"],
		summary: "Set default payment method",
		description: "Update the Stripe customer's default payment method for invoices",
	})
	.input(
		z.object({
			paymentMethodId: z.string(),
			organizationId: z.string().optional(),
		}),
	)
	.output(
		z.object({
			updated: z.literal(true),
		}),
	)
	.handler(async ({ input: { paymentMethodId, organizationId }, context: { user } }) => {
		const entity = organizationId
			? await getOrganizationById(organizationId)
			: await getUserById(user.id);

		if (!entity) {
			throw new ORPCError("NOT_FOUND");
		}

		const customerId = entity.paymentsCustomerId;

		if (!customerId) {
			throw new ORPCError("NOT_FOUND");
		}

		try {
			const stripe = getStripeClient();
			await stripe.customers.update(customerId, {
				invoice_settings: { default_payment_method: paymentMethodId },
			});
			return { updated: true as const };
		} catch (e) {
			logger.error("Could not set default payment method", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
