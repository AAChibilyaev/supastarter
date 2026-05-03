import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

const DAY_MS = 24 * 60 * 60 * 1000;

export const topQueries = protectedProcedure
	.route({
		method: "GET",
		path: "/search/top-queries",
		tags: ["Search"],
		summary: "Get top search queries",
		description:
			"Returns the most frequent search query types for a given organization and time period.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			days: z.number().int().min(1).max(365).optional().default(7),
			limit: z.number().int().min(1).max(100).optional().default(10),
			indexId: z.string().optional(),
		}),
	)
	.handler(async ({ input: { organizationId, days, limit, indexId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const since = new Date(Date.now() - days * DAY_MS);

		const aggregated = await db.searchUsageEvent.groupBy({
			by: ["type"],
			where: {
				organizationId,
				...(indexId ? { indexId } : {}),
				createdAt: { gte: since },
			},
			_sum: { count: true },
			orderBy: [{ _sum: { count: "desc" } }],
			take: limit,
		});

		return aggregated.map((row) => ({
			query: row.type,
			count: (row._sum.count ?? 0).toString(),
		}));
	});
