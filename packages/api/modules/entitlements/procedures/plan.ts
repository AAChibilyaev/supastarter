import {
	resolveOrgPlan,
	checkQuota,
	checkHardLimit,
	resolveOrgSoftCapThreshold,
} from "@repo/payments/lib/entitlements";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const getPlanInfo = protectedProcedure
	.route({
		method: "GET",
		path: "/entitlements/plan",
		tags: ["Entitlements"],
		summary: "Get current plan info and usage",
		description:
			"Returns the organization's plan, feature availability, and current quota usage.",
	})
	.input(z.object({ organizationId: z.string() }))
	.output(
		z.object({
			planId: z.string(),
			planName: z.string(),
			status: z.string(),
			features: z.record(z.string(), z.boolean()),
			limits: z.object({
				maxIndexes: z.number(),
				maxDocuments: z.number(),
				maxSearchesPerMonth: z.number(),
				maxApiKeys: z.number(),
				rateLimitPerMinute: z.number(),
				maxProjects: z.number(),
			}),
			overageRateUsdMicrosPerSearch: z.number(),
			usage: z.object({
				searches: z.object({
					current: z.number(),
					limit: z.number(),
					remaining: z.number(),
					isUnlimited: z.boolean(),
					percentUsed: z.number(),
				}),
				documents: z.object({
					current: z.number(),
					limit: z.number(),
					remaining: z.number(),
					isUnlimited: z.boolean(),
					percentUsed: z.number(),
				}),
			}),
			graceReadsUntil: z.string().nullable(),
			graceWritesUntil: z.string().nullable(),
			softCapThreshold: z.number(),
		}),
	)
	.handler(async ({ input: { organizationId } }) => {
		const plan = await resolveOrgPlan(organizationId);
		const searchQuota = await checkQuota(organizationId, "search");
		const ingestQuota = await checkQuota(organizationId, "ingest");
		const softCapThreshold = Math.round(
			(await resolveOrgSoftCapThreshold(organizationId)) * 100,
		);

		const searchesLimit = checkHardLimit(searchQuota.current, searchQuota.limit);
		const documentsLimit = checkHardLimit(ingestQuota.current, ingestQuota.limit);

		// Convert boolean features
		const features: Record<string, boolean> = {};
		for (const [key, value] of Object.entries(plan.features)) {
			if (typeof value === "boolean") {
				features[key] = value;
			} else {
				features[key] = value !== "none";
			}
		}

		return {
			planId: plan.planId,
			planName: plan.name,
			status: plan.status,
			features,
			limits: {
				maxIndexes: plan.limits.maxIndexes,
				maxDocuments: plan.limits.maxDocuments,
				maxSearchesPerMonth: plan.limits.maxSearchesPerMonth,
				maxApiKeys: plan.limits.maxApiKeys,
				rateLimitPerMinute: plan.limits.rateLimitPerMinute,
				maxProjects: plan.limits.maxProjects,
			},
			overageRateUsdMicrosPerSearch: plan.overageRateUsdMicrosPerSearch,
			usage: {
				searches: {
					current: searchQuota.current,
					limit: searchQuota.limit,
					remaining: searchQuota.remaining,
					isUnlimited: searchQuota.isUnlimited,
					percentUsed: searchesLimit.percentUsed,
				},
				documents: {
					current: ingestQuota.current,
					limit: ingestQuota.limit,
					remaining: ingestQuota.remaining,
					isUnlimited: ingestQuota.isUnlimited,
					percentUsed: documentsLimit.percentUsed,
				},
			},
			graceReadsUntil: plan.graceReadsUntil?.toISOString() ?? null,
			graceWritesUntil: plan.graceWritesUntil?.toISOString() ?? null,
			softCapThreshold,
		};
	});
