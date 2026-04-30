import { ORPCError } from "@orpc/client";
import { db, getKnowledgeSpaceBySlug } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerMember } from "../lib/access";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const usageMetrics = protectedProcedure
	.route({
		method: "GET",
		path: "/knowledge/usage",
		tags: ["Knowledge"],
		summary: "Knowledge usage and observability metrics",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireKnowledgeOwnerMember(
			{
				ownerType: input.ownerType,
				ownerId: input.ownerId,
			},
			user,
		);

		const scope = {
			ownerType: input.ownerType,
			organizationId: input.ownerType === "ORGANIZATION" ? input.ownerId : undefined,
			userId: input.ownerType === "USER" ? input.ownerId : undefined,
		};
		const space = await getKnowledgeSpaceBySlug(scope, input.spaceSlug);
		if (!space) {
			throw new ORPCError("NOT_FOUND", { message: "Knowledge space not found" });
		}

		const [sourceCount, documentCount, chunkCount, jobStats, graphNodeCount, graphEdgeCount] =
			await Promise.all([
				db.dataSource.count({ where: { knowledgeSpaceId: space.id } }),
				db.knowledgeDocument.count({ where: { knowledgeSpaceId: space.id } }),
				db.knowledgeChunk.count({ where: { knowledgeSpaceId: space.id } }),
				db.ingestionJob.groupBy({
					by: ["status"],
					where: { knowledgeSpaceId: space.id },
					_count: { status: true },
				}),
				db.graphNode.count({ where: { knowledgeSpaceId: space.id } }),
				db.graphEdge.count({ where: { knowledgeSpaceId: space.id } }),
			]);

		return {
			sourceCount,
			documentCount,
			chunkCount,
			graphNodeCount,
			graphEdgeCount,
			jobStats: jobStats.map((entry) => ({
				status: entry.status,
				count: entry._count.status,
			})),
		};
	});
