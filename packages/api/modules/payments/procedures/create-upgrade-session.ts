import { ORPCError } from "@orpc/client";
import {
	getOrganizationMembership,
	getPurchasesByOrganizationId,
	getPurchasesByUserId,
} from "@repo/database";
import { logger } from "@repo/logs";
import {
	createUpgradeSession as createUpgradeSessionFn,
	findPriceByPlanId,
	getCustomerIdFromEntity,
	getProviderPriceIdByPlanId,
	type PlanId,
} from "@repo/payments";
import { invalidatePlanCache } from "@repo/payments/lib/entitlements";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const createUpgradeSession = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/create-upgrade-session",
		tags: ["Payments"],
		summary: "Create upgrade session",
		description:
			"Creates a Stripe Checkout session for plan upgrades that require immediate payment, " +
			"or directly updates the subscription if no payment is needed.",
	})
	.input(
		z.object({
			newPlanId: z.string(),
			interval: z.enum(["month", "year"]).optional(),
			organizationId: z.string().optional(),
			returnUrl: z.string().url(),
		}),
	)
	.handler(
		async ({
			input: { newPlanId, interval, organizationId, returnUrl },
			context: { user },
		}) => {
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

			// Get the customer ID for Stripe operations
			const customerId = await getCustomerIdFromEntity(
				organizationId
					? { organizationId }
					: activePurchase.userId
						? { userId: activePurchase.userId }
						: { userId: user.id },
			);

			if (!customerId) {
				throw new ORPCError("NOT_FOUND", {
					message: "No Stripe customer found for this account",
				});
			}

			// Create the upgrade session
			try {
				const result = await createUpgradeSessionFn({
					subscriptionId: activePurchase.subscriptionId,
					newPriceId,
					customerId,
					organizationId: organizationId ?? undefined,
					userId: user.id,
					returnUrl,
				});

				// If the subscription was updated directly (no payment needed),
				// invalidate the plan cache immediately
				if (result.type === "direct_update" && result.success) {
					const targetOrgId = organizationId ?? activePurchase.organizationId;
					if (targetOrgId) {
						invalidatePlanCache(targetOrgId);
					}
				}

				return result;
			} catch (e) {
				logger.error("Failed to create upgrade session", e);
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to create upgrade session",
				});
			}
		},
	);
