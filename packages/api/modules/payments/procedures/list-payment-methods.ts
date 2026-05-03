import { ORPCError } from "@orpc/client";
import { getOrganizationById, getUserById } from "@repo/database";
import { logger } from "@repo/logs";
import { getStripeClient } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const listPaymentMethods = protectedProcedure
	.route({
		method: "GET",
		path: "/payments/payment-methods",
		tags: ["Payments"],
		summary: "List payment methods",
		description: "List all saved payment methods (cards) for the current user or organization",
	})
	.input(
		z.object({
			organizationId: z.string().optional(),
		}),
	)
	.output(
		z.object({
			paymentMethods: z.array(
				z.object({
					id: z.string(),
					brand: z.string(),
					last4: z.string(),
					expMonth: z.number(),
					expYear: z.number(),
					isDefault: z.boolean(),
				}),
			),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		const entity = organizationId
			? await getOrganizationById(organizationId)
			: await getUserById(user.id);

		if (!entity) {
			throw new ORPCError("NOT_FOUND");
		}

		const customerId = entity.paymentsCustomerId;

		if (!customerId) {
			return { paymentMethods: [] };
		}

		try {
			const stripe = getStripeClient();

			const [methods, customer] = await Promise.all([
				stripe.paymentMethods.list({ customer: customerId, type: "card" }),
				stripe.customers.retrieve(customerId),
			]);

			const defaultMethodId =
				!customer.deleted &&
				typeof customer.invoice_settings?.default_payment_method === "string"
					? customer.invoice_settings.default_payment_method
					: null;

			return {
				paymentMethods: methods.data.map((pm) => ({
					id: pm.id,
					brand: pm.card?.brand ?? "unknown",
					last4: pm.card?.last4 ?? "????",
					expMonth: pm.card?.exp_month ?? 0,
					expYear: pm.card?.exp_year ?? 0,
					isDefault: pm.id === defaultMethodId,
				})),
			};
		} catch (e) {
			logger.error("Could not list payment methods", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
