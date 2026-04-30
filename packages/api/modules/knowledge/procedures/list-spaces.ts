import { listKnowledgeSpaces } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerMember } from "../lib/access";
import { knowledgeOwnerTypeSchema } from "../types";

export const listSpaces = protectedProcedure
	.route({
		method: "GET",
		path: "/knowledge/spaces",
		tags: ["Knowledge"],
		summary: "List knowledge spaces",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
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

		return listKnowledgeSpaces({
			ownerType: input.ownerType,
			organizationId: input.ownerType === "ORGANIZATION" ? input.ownerId : undefined,
			userId: input.ownerType === "USER" ? input.ownerId : undefined,
		});
	});
