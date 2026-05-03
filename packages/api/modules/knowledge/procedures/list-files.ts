import { ORPCError } from "@orpc/client";
import { getKnowledgeSpaceBySlug, listKnowledgeDocuments } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerMember } from "../lib/access";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const listFiles = protectedProcedure
	.route({
		method: "GET",
		path: "/knowledge/files",
		tags: ["Knowledge"],
		summary: "List indexed files (knowledge documents) for a space",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			sortBy: z.enum(["createdAt", "updatedAt"]).optional(),
			sortOrder: z.enum(["asc", "desc"]).optional(),
		}),
	)
	.output(
		z.array(
			z.object({
				id: z.string(),
				title: z.string(),
				mimeType: z.string(),
				sourceType: z.string(),
				externalId: z.string(),
				language: z.string(),
				chunkCount: z.number(),
				version: z.number(),
				createdAt: z.string(),
				updatedAt: z.string(),
				contentPreview: z.string(),
			}),
		),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireKnowledgeOwnerMember(
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

		const docs = await listKnowledgeDocuments(space.id, {
			sortBy: input.sortBy,
			sortOrder: input.sortOrder,
		});

		return docs.map((doc) => ({
			id: doc.id,
			title: doc.title,
			mimeType: doc.mimeType,
			sourceType: doc.sourceType,
			externalId: doc.externalId,
			language: doc.language,
			chunkCount: doc._count.chunks,
			version: doc.version,
			createdAt: doc.createdAt.toISOString(),
			updatedAt: doc.updatedAt.toISOString(),
			contentPreview: doc.contentText.slice(0, 500),
		}));
	});
