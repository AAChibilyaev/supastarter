import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { resolveOrgPlan } from "@repo/payments/lib/entitlements";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const getTrialInfo = protectedProcedure
	.route({
		method: "GET",
		path: "/organizations/trial-info",
		tags: ["Organizations"],
		summary: "Get trial info for an organization",
		description:
			"Returns trial status, days remaining, and plan info for a given organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			isTrialing: z.boolean(),
			daysRemaining: z.number().int(),
			trialEndsAt: z.string().nullable(),
			planId: z.string(),
			planName: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId } }) => {
		try {
			const org = await db.organization.findUnique({
				where: { id: organizationId },
				select: { trialEndsAt: true },
			});

			if (!org?.trialEndsAt) {
				return {
					isTrialing: false,
					daysRemaining: 0,
					trialEndsAt: null,
					planId: "free",
					planName: "Free",
				};
			}

			const now = new Date();
			const trialEnd = new Date(org.trialEndsAt);
			const isTrialing = trialEnd > now;

			const daysRemaining = isTrialing
				? Math.max(
						1,
						Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
					)
				: 0;

			const plan = isTrialing ? await resolveOrgPlan(organizationId) : null;

			return {
				isTrialing,
				daysRemaining,
				trialEndsAt: trialEnd.toISOString(),
				planId: plan?.planId ?? "free",
				planName: plan?.name ?? "Free",
			};
		} catch (error) {
			logger.error("getTrialInfo failed", { error, organizationId });
			return {
				isTrialing: false,
				daysRemaining: 0,
				trialEndsAt: null,
				planId: "free",
				planName: "Free",
			};
		}
	});
