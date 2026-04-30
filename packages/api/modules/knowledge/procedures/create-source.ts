import { ORPCError } from "@orpc/client";
import { createDataSource, getKnowledgeSpaceBySlug } from "@repo/database";
import type { Prisma } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerAdmin } from "../lib/access";
import {
	knowledgeOwnerTypeSchema,
	knowledgeSourceTypeSchema,
	knowledgeSpaceSlugSchema,
} from "../types";

export const createSource = protectedProcedure
	.route({
		method: "POST",
		path: "/knowledge/sources",
		tags: ["Knowledge"],
		summary: "Create data source",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			sourceType: knowledgeSourceTypeSchema,
			name: z.string().min(1).max(120),
			config: z.record(z.string(), z.unknown()).optional(),
			credentialRef: z.string().max(255).optional(),
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

		return createDataSource({
			knowledgeSpaceId: space.id,
			sourceType: input.sourceType,
			name: input.name,
			config: input.config as Prisma.InputJsonValue | undefined,
			credentialRef: input.credentialRef,
		});
	});
