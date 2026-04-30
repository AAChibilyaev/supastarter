import { ORPCError } from "@orpc/client";
import { db, getKnowledgeSpaceBySlug } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerMember } from "../lib/access";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const listIngestionJobs = protectedProcedure
	.route({
		method: "GET",
		path: "/knowledge/ingestion/jobs",
		tags: ["Knowledge"],
		summary: "List ingestion jobs",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			limit: z.number().int().min(1).max(100).optional(),
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

		return db.ingestionJob.findMany({
			where: { knowledgeSpaceId: space.id },
			orderBy: { createdAt: "desc" },
			take: input.limit ?? 20,
			include: {
				dataSource: {
					select: { id: true, name: true, sourceType: true },
				},
			},
		});
	});
