import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { CypherQueries, verifyConnection, query } from "@repo/recommendations";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const personalized = protectedProcedure
	.route({
		method: "GET",
		path: "/recommendations/personalized",
		tags: ["Recommendations"],
		summary: "Get personalized recommendations",
		description:
			"Returns personalized recommendations for a user based on their view/purchase history and content similarity.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			userId: z.string(),
			limit: z.coerce.number().min(1).max(100).default(10),
		}),
	)
	.output(
		z.object({
			results: z.array(
				z.object({
					id: z.string(),
					title: z.string(),
					score: z.number(),
					reasonCount: z.number().optional(),
				}),
			),
			neo4jConnected: z.boolean(),
		}),
	)
	.handler(async ({ input: { organizationId, userId, limit }, context: { user } }) => {
		await requireOrganizationAccess(organizationId, user.id);

		try {
			const health = await verifyConnection();
			if (!health.connected) {
				return { results: [], neo4jConnected: false };
			}

			const result = await query(CypherQueries.PERSONALIZED_RECOMMENDATIONS, {
				userId,
				limit,
			});

			const results = result.records.map((record) => ({
				id: record.get("id") as string,
				title: record.get("title") as string,
				score: record.get("score") as number,
				reasonCount: record.get("reasonCount") as number | undefined,
			}));

			return { results, neo4jConnected: true };
		} catch (err) {
			logger.error(
				{ err, userId },
				"Failed to fetch personalized recommendations from Neo4j",
			);
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Recommendation engine unavailable",
			});
		}
	});
