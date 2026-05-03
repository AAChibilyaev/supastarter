import { ORPCError } from "@orpc/client";
import { getPurchasesByOrganizationId, getPurchasesByUserId } from "@repo/database";
import { logger } from "@repo/logs";
import {
	findPriceByPlanId,
	getProrationPreview as getProrationPreviewFn,
	getProviderPriceIdByPlanId,
	type PlanId,
} from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const getProrationPreview = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/proration-preview",
		tags: ["Payments"],
		summary: "Preview proration",
		description:
			"Calculates the prorated charges/credits for changing subscription plans, without applying the change.",
	})
	.input(
		z.object({
			newPlanId: z.string(),
			interval: z.enum(["month", "year"]).optional(),
			organizationId: z.string().optional(),
		}),
	)
	.handler(async ({ input: { newPlanId, interval, organizationId }, context: { user } }) => {
		// Find the active subscription purchase
		const purchases = organizationId
			? await getPurchasesByOrganizationId(organizationId)
			: await getPurchasesByUserId(user.id);

		const activePurchase = purchases.find((p) => p.subscriptionId && p.status === "active");

		if (!activePurchase) {
			throw new ORPCError("NOT_FOUND", {
				message: "No active subscription found",
			});
		}

		if (!activePurchase.subscriptionId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Purchase has no subscription ID",
			});
		}

		// Resolve new price ID from plan
		const price = findPriceByPlanId(newPlanId as PlanId, {
			type: "subscription",
			interval,
		});
		const newPriceId = getProviderPriceIdByPlanId(newPlanId as PlanId, {
			type: "subscription",
			interval,
		});

		if (!price || !newPriceId) {
			throw new ORPCError("NOT_FOUND", {
				message: "Price not found for the requested plan",
			});
		}

		// Get proration preview from Stripe
		try {
			const preview = await getProrationPreviewFn({
				subscriptionId: activePurchase.subscriptionId,
				newPriceId,
			});

			return preview;
		} catch (e) {
			logger.error("Failed to get proration preview", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to get proration preview",
			});
		}
	});
