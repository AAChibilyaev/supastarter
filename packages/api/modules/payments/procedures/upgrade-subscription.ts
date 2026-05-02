import { ORPCError } from "@orpc/client";
import {
	getOrganizationMembership,
	getPurchasesByOrganizationId,
	getPurchasesByUserId,
} from "@repo/database";
import { logger } from "@repo/logs";
import {
	findPriceByPlanId,
	getProviderPriceIdByPlanId,
	upgradeSubscription as upgradeSubscriptionFn,
	type PlanId,
} from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const upgradeSubscription = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/upgrade-subscription",
		tags: ["Payments"],
		summary: "Upgrade or downgrade subscription",
		description:
			"Changes the plan of an active subscription with proration. Requires owner or admin role for org-owned subscriptions.",
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

		// Authorization: only owner/admin can change org subscriptions
		if (activePurchase.organizationId) {
			const membership = await getOrganizationMembership(
				activePurchase.organizationId,
				user.id,
			);

			if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
				throw new ORPCError("FORBIDDEN");
			}
		} else if (activePurchase.userId && activePurchase.userId !== user.id) {
			throw new ORPCError("FORBIDDEN");
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

		// Perform the upgrade
		try {
			await upgradeSubscriptionFn({
				subscriptionId: activePurchase.subscriptionId,
				newPriceId,
				prorationBehavior: "create_prorations",
			});

			return { success: true };
		} catch (e) {
			logger.error("Failed to upgrade subscription", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to upgrade subscription",
			});
		}
	});
