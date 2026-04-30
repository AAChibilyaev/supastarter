import { ORPCError } from "@orpc/client";
import { createKnowledgeSpace, getKnowledgeSpaceBySlug } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerAdmin } from "../lib/access";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const createSpace = protectedProcedure
	.route({
		method: "POST",
		path: "/knowledge/spaces",
		tags: ["Knowledge"],
		summary: "Create knowledge space",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			slug: knowledgeSpaceSlugSchema,
			name: z.string().min(1).max(120),
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

		const existing = await getKnowledgeSpaceBySlug(
			{
				ownerType: input.ownerType,
				organizationId: input.ownerType === "ORGANIZATION" ? input.ownerId : undefined,
				userId: input.ownerType === "USER" ? input.ownerId : undefined,
			},
			input.slug,
		);
		if (existing) {
			throw new ORPCError("CONFLICT", { message: "Knowledge space slug already exists" });
		}

		return createKnowledgeSpace({
			ownerType: input.ownerType,
			organizationId: input.ownerType === "ORGANIZATION" ? input.ownerId : undefined,
			userId: input.ownerType === "USER" ? input.ownerId : undefined,
			slug: input.slug,
			name: input.name,
		});
	});
