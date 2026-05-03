import { db } from "@repo/database";
import { resolveOrgPlan } from "@repo/payments/lib/entitlements";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { knowledgeOwnerTypeSchema } from "../types";

// ─── My Search plan limits (hardcoded, no DB) ────────────────────────────────

type MySearchPlanId = "free" | "pro" | "unlimited";

interface MySearchPlanLimits {
	planId: MySearchPlanId;
	fileLimit: number;
	storageLimitBytes: number;
	aiAskLimit: number | null; // null = unlimited
}

const MY_SEARCH_LIMITS: Record<MySearchPlanId, MySearchPlanLimits> = {
	free: {
		planId: "free",
		fileLimit: 100,
		storageLimitBytes: 1 * 1024 * 1024 * 1024, // 1 GB
		aiAskLimit: 50,
	},
	pro: {
		planId: "pro",
		fileLimit: 1_000,
		storageLimitBytes: 10 * 1024 * 1024 * 1024, // 10 GB
		aiAskLimit: 1_000,
	},
	unlimited: {
		planId: "unlimited",
		fileLimit: 10_000,
		storageLimitBytes: 100 * 1024 * 1024 * 1024, // 100 GB
		aiAskLimit: null,
	},
};

/**
 * Map the general billing plan to a My Search tier.
 * Free → free, Starter/Pro → pro, Business/Enterprise → unlimited.
 */
function resolveMySearchPlanId(generalPlanId: string): MySearchPlanId {
	if (generalPlanId === "pro" || generalPlanId === "starter") return "pro";
	if (generalPlanId === "business" || generalPlanId === "enterprise") return "unlimited";
	return "free";
}

function getPeriodStart(): Date {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// ─── Procedure ───────────────────────────────────────────────────────────────

export const mySearchBilling = protectedProcedure
	.route({
		method: "GET",
		path: "/knowledge/my-search-billing",
		tags: ["Knowledge"],
		summary: "My Search billing usage and plan limits",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
		}),
	)
	.output(
		z.object({
			plan: z.enum(["free", "pro", "unlimited"]),
			fileCount: z.number(),
			fileLimit: z.number(),
			storageUsedBytes: z.number(),
			storageLimitBytes: z.number(),
			aiAsksThisMonth: z.number(),
			aiAskLimit: z.number().nullable(),
		}),
	)
	.handler(async ({ input, context: { user: _user } }) => {
		const { ownerType, ownerId } = input;

		// Resolve My Search plan from general org plan
		let mySearchPlanId: MySearchPlanId = "free";
		if (ownerType === "ORGANIZATION") {
			const generalPlan = await resolveOrgPlan(ownerId);
			mySearchPlanId = resolveMySearchPlanId(generalPlan.planId);
		}

		const limits = MY_SEARCH_LIMITS[mySearchPlanId];

		// Build scope filter for KnowledgeSpace lookup
		const spaceWhere =
			ownerType === "ORGANIZATION"
				? { ownerType: "ORGANIZATION" as const, organizationId: ownerId }
				: { ownerType: "USER" as const, userId: ownerId };

		// Get all space IDs for this owner
		const spaces = await db.knowledgeSpace.findMany({
			where: spaceWhere,
			select: { id: true },
		});
		const spaceIds = spaces.map((s) => s.id);

		// File count: KnowledgeDocument count across all spaces
		const fileCount =
			spaceIds.length === 0
				? 0
				: await db.knowledgeDocument.count({
						where: { knowledgeSpaceId: { in: spaceIds } },
					});

		// Storage estimate: sum of contentText byte lengths
		// Uses aggregate on text length (PostgreSQL char_length as UTF-8 byte approximation)
		let storageUsedBytes = 0;
		if (spaceIds.length > 0 && fileCount > 0) {
			const docs = await db.knowledgeDocument.findMany({
				where: { knowledgeSpaceId: { in: spaceIds } },
				select: { contentText: true },
			});
			storageUsedBytes = docs.reduce(
				(sum, doc) => sum + Buffer.byteLength(doc.contentText, "utf8"),
				0,
			);
		}

		// AI asks: count AiUsageEvent rows for operation = "my_search_rag" in current month
		const periodStart = getPeriodStart();
		const aiAsksThisMonth = await db.aiUsageEvent.count({
			where: {
				organizationId: ownerType === "ORGANIZATION" ? ownerId : undefined,
				userId: ownerType === "USER" ? ownerId : undefined,
				operation: "my_search_rag",
				createdAt: { gte: periodStart },
			},
		});

		return {
			plan: mySearchPlanId,
			fileCount,
			fileLimit: limits.fileLimit,
			storageUsedBytes,
			storageLimitBytes: limits.storageLimitBytes,
			aiAsksThisMonth,
			aiAskLimit: limits.aiAskLimit,
		};
	});
