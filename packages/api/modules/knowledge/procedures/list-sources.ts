import { ORPCError } from "@orpc/client";
import { getKnowledgeSpaceBySlug, listDataSources } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerMember } from "../lib/access";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const listSources = protectedProcedure
	.route({
		method: "GET",
		path: "/knowledge/sources",
		tags: ["Knowledge"],
		summary: "List data sources",
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

		const space = await getKnowledgeSpaceBySlug(
			{
				ownerType: input.ownerType,
				organizationId: input.ownerType === "ORGANIZATION" ? input.ownerId : undefined,
				userId: input.ownerType === "USER" ? input.ownerId : undefined,
			},
			input.spaceSlug,
		);
		if (!space) {
			throw new ORPCError("NOT_FOUND", { message: "Knowledge space not found" });
		}

		return listDataSources(space.id);
	});
