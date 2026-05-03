import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { CypherQueries, verifyConnection, query } from "@repo/recommendations";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const trending = protectedProcedure
	.route({
		method: "GET",
		path: "/recommendations/trending",
		tags: ["Recommendations"],
		summary: "Get trending products",
		description:
			"Returns trending products based on view/purchase activity in a configurable time window.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			window: z.enum(["7", "30"]).default("7"),
			limit: z.coerce.number().min(1).max(100).default(10),
		}),
	)
	.output(
		z.object({
			results: z.array(
				z.object({
					id: z.string(),
					title: z.string(),
					activityCount: z.number(),
				}),
			),
			window: z.string(),
			neo4jConnected: z.boolean(),
		}),
	)
	.handler(async ({ input: { organizationId, window, limit }, context: { user } }) => {
		await requireOrganizationAccess(organizationId, user.id);

		try {
			const health = await verifyConnection();
			if (!health.connected) {
				return { results: [], window: `${window}d`, neo4jConnected: false };
			}
			// TRENDING_PRODUCTS uses Neo4j duration syntax: e.g. "P7D"
			const windowDuration = `P${window}D`;

			const result = await query(CypherQueries.TRENDING_PRODUCTS, {
				window: windowDuration,
				limit,
			});

			const results = result.records.map((record) => ({
				id: record.get("id") as string,
				title: record.get("title") as string,
				activityCount: record.get("activityCount") as number,
			}));

			return {
				results,
				window: `${window}d`,
				neo4jConnected: true,
			};
		} catch (err) {
			logger.error({ err, window }, "Failed to fetch trending from Neo4j");
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Recommendation engine unavailable",
			});
		}
	});
