import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { getStripeClient } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const deletePaymentMethod = protectedProcedure
	.route({
		method: "DELETE",
		path: "/payments/payment-methods/{paymentMethodId}",
		tags: ["Payments"],
		summary: "Delete payment method",
		description: "Detach a saved payment method (card) from the customer",
	})
	.input(
		z.object({
			paymentMethodId: z.string(),
		}),
	)
	.output(
		z.object({
			deleted: z.literal(true),
		}),
	)
	.handler(async ({ input: { paymentMethodId } }) => {
		try {
			const stripe = getStripeClient();
			await stripe.paymentMethods.detach(paymentMethodId);
			return { deleted: true as const };
		} catch (e) {
			logger.error("Could not delete payment method", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
