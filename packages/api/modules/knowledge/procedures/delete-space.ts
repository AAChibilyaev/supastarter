import { ORPCError } from "@orpc/client";
import { deleteKnowledgeSpace, getKnowledgeSpaceBySlug } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerAdmin } from "../lib/access";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const deleteSpace = protectedProcedure
	.route({
		method: "DELETE",
		path: "/knowledge/spaces/{slug}",
		tags: ["Knowledge"],
		summary: "Delete knowledge space",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			slug: knowledgeSpaceSlugSchema,
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
		const space = await getKnowledgeSpaceBySlug(scope, input.slug);
		if (!space) {
			throw new ORPCError("NOT_FOUND", { message: "Knowledge space not found" });
		}

		return deleteKnowledgeSpace(space.id);
	});
