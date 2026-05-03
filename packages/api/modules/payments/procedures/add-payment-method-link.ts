import { ORPCError } from "@orpc/client";
import { getOrganizationById, getUserById } from "@repo/database";
import { logger } from "@repo/logs";
import { getStripeClient } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const addPaymentMethodLink = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/payment-methods/add-link",
		tags: ["Payments"],
		summary: "Add payment method link",
		description:
			"Create a Stripe Customer Portal session with payment_method_update flow for adding a new card",
	})
	.input(
		z.object({
			organizationId: z.string().optional(),
			redirectUrl: z.string().optional(),
		}),
	)
	.output(
		z.object({
			url: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId, redirectUrl }, context: { user } }) => {
		const entity = organizationId
			? await getOrganizationById(organizationId)
			: await getUserById(user.id);

		if (!entity) {
			throw new ORPCError("NOT_FOUND");
		}

		const customerId = entity.paymentsCustomerId;

		if (!customerId) {
			throw new ORPCError("NOT_FOUND", {
				message: "No billing account found. Please subscribe to a plan first.",
			});
		}

		try {
			const stripe = getStripeClient();
			const session = await stripe.billingPortal.sessions.create({
				customer: customerId,
				return_url: redirectUrl ?? "",
				flow_data: {
					type: "payment_method_update",
				},
			});
			return { url: session.url };
		} catch (e) {
			logger.error("Could not create add-payment-method portal session", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
