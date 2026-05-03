import { ORPCError } from "@orpc/client";
import { deleteDataSource, getKnowledgeSpaceBySlug, listDataSources } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerAdmin } from "../lib/access";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const deleteSource = protectedProcedure
	.route({
		method: "DELETE",
		path: "/knowledge/sources/{id}",
		tags: ["Knowledge"],
		summary: "Delete data source",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			sourceId: z.string(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireKnowledgeOwnerAdmin(
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

		const sources = await listDataSources(space.id);
		const source = sources.find((s) => s.id === input.sourceId);
		if (!source) {
			throw new ORPCError("NOT_FOUND", { message: "Data source not found" });
		}

		return deleteDataSource(input.sourceId);
	});
