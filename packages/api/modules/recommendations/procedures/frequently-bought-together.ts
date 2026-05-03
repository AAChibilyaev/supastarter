import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { CypherQueries, verifyConnection, query } from "@repo/recommendations";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const frequentlyBoughtTogether = protectedProcedure
	.route({
		method: "GET",
		path: "/recommendations/frequently-bought-together",
		tags: ["Recommendations"],
		summary: "Get frequently bought together products",
		description:
			"Returns products frequently bought together with the given product (collaborative filtering via PURCHASED edges).",
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
					cooccurrence: z.number(),
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

			const result = await query(CypherQueries.FREQUENTLY_BOUGHT_TOGETHER, { productId, limit });

			const results = result.records.map((record) => ({
				id: record.get("id") as string,
				title: record.get("title") as string,
				cooccurrence: record.get("cooccurrence") as number,
			}));

			return { results, neo4jConnected: true };
		} catch (err) {
			logger.error({ err, productId }, "Failed to fetch frequently bought together from Neo4j");
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Recommendation engine unavailable",
			});
		}
	});
