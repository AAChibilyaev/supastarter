import { ORPCError } from "@orpc/client";
import {
	db,
	getOrganizationMembership,
	getPurchasesByOrganizationId,
	getPurchasesByUserId,
} from "@repo/database";
import { logger } from "@repo/logs";
import { createNotification } from "@repo/notifications";
import {
	findPriceByPlanId,
	getProviderPriceIdByPlanId,
	upgradeSubscription as upgradeSubscriptionFn,
	type PlanId,
} from "@repo/payments";
import { invalidatePlanCache } from "@repo/payments/lib/entitlements";
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
			const membership = await getOrganizationMembership(activePurchase.organizationId, user.id);

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

			// Immediately invalidate the plan cache so the new limits take effect
			const orgId = organizationId ?? activePurchase.organizationId ?? null;
			if (orgId) {
				invalidatePlanCache(orgId);
			}

			// Send plan upgrade welcome notification (fire-and-forget)
			sendUpgradeNotification(orgId, user.id, newPlanId).catch((err: unknown) =>
				logger.error("Failed to send upgrade notification", err),
			);

			return { success: true };
		} catch (e) {
			logger.error("Failed to upgrade subscription", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to upgrade subscription",
			});
		}
	});

/**
 * Fire-and-forget helper to send upgrade notification to org admins or the user.
 */
async function sendUpgradeNotification(
	orgId: string | null,
	userId: string,
	newPlanId: string,
): Promise<void> {
	const planName = newPlanId;

	let recipientIds: string[];
	let dashboardUrl: string;

	if (orgId) {
		const [orgMembers, org] = await Promise.all([
			db.member.findMany({
				where: { organizationId: orgId, role: { in: ["owner", "admin"] } },
				select: { userId: true },
			}),
			db.organization.findUnique({
				where: { id: orgId },
				select: { slug: true },
			}),
		]);
		recipientIds = orgMembers.length > 0 ? orgMembers.map((m) => m.userId) : [userId];
		dashboardUrl = org?.slug ? `/organizations/${org.slug}/settings/billing` : "/settings/billing";
	} else {
		recipientIds = [userId];
		dashboardUrl = "/settings/billing";
	}

	await Promise.all(
		recipientIds.map((uid) =>
			createNotification({
				userId: uid,
				type: "WELCOME",
				data: {
					headline: `Plan upgraded to ${planName}`,
					message:
						`Your plan has been successfully upgraded to ${planName}. ` +
						"You now have access to all the features and increased limits of your new plan.",
				},
				link: dashboardUrl,
			}).catch((err: unknown) =>
				logger.error("Failed to send upgrade notification to user", { userId: uid, err }),
			),
		),
	);
}
