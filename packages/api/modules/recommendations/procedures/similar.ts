import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { CypherQueries, verifyConnection, query } from "@repo/recommendations";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const similar = protectedProcedure
	.route({
		method: "GET",
		path: "/recommendations/similar",
		tags: ["Recommendations"],
		summary: "Get similar products",
		description:
			"Returns content-based similar products using SIMILAR_TO edges in the Neo4j graph.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			productId: z.string(),
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
					similarityType: z.string().optional(),
				}),
			),
			neo4jConnected: z.boolean(),
		}),
	)
	.handler(async ({ input: { organizationId, productId, limit }, context: { user } }) => {
		await requireOrganizationAccess(organizationId, user.id);

		try {
			const health = await verifyConnection();
			if (!health.connected) {
				return { results: [], neo4jConnected: false };
			}

			const result = await query(CypherQueries.SIMILAR_PRODUCTS, {
				productId,
				limit,
			});

			const results = result.records.map((record) => ({
				id: record.get("id") as string,
				title: record.get("title") as string,
				score: record.get("score") as number,
				similarityType: record.get("similarityType") as string | undefined,
			}));

			return { results, neo4jConnected: true };
		} catch (err) {
			logger.error({ err, productId }, "Failed to fetch similar products from Neo4j");
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Recommendation engine unavailable",
			});
		}
	});
