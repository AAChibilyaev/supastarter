import { ORPCError } from "@orpc/client";
import { getPurchaseById } from "@repo/database";
import { createSetupIntent as createSetupIntentFn } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const createSetupIntent = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/create-setup-intent",
		tags: ["Payments"],
		summary: "Create SetupIntent for adding a new card",
		description:
			"Creates a Stripe SetupIntent with a client secret so the frontend can collect a new payment method via Stripe Elements.",
	})
	.input(
		z.object({
			purchaseId: z.string().describe("The purchase ID whose customer will get a new card"),
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
			throw new ORPCError("BAD_REQUEST", {
				message: "Purchase has no Stripe customer ID",
			});
		}

		return createSetupIntentFn(purchase.customerId);
	});
