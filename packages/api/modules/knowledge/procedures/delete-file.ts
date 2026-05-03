import { ORPCError } from "@orpc/client";
import { db, deleteKnowledgeDocument, getKnowledgeSpaceBySlug } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerAdmin } from "../lib/access";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const deleteFile = protectedProcedure
	.route({
		method: "DELETE",
		path: "/knowledge/files/:fileId",
		tags: ["Knowledge"],
		summary: "Delete an indexed file (knowledge document) and its chunks",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			fileId: z.string().min(1),
		}),
	)
	.output(z.object({ deleted: z.boolean() }))
	.handler(async ({ input, context: { user } }) => {
		await requireKnowledgeOwnerAdmin(
			{ ownerType: input.ownerType, ownerId: input.ownerId },
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

		// Verify document belongs to this space
		const doc = await db.knowledgeDocument.findFirst({
			where: { id: input.fileId, knowledgeSpaceId: space.id },
			select: { id: true },
		});
		if (!doc) {
			throw new ORPCError("NOT_FOUND", { message: "File not found" });
		}

		await deleteKnowledgeDocument(input.fileId);
		return { deleted: true };
	});
