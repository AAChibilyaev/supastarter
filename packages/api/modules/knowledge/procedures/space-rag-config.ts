import { ORPCError } from "@orpc/client";
import { getKnowledgeSpaceBySlug, getSpaceRagConfig, upsertSpaceRagConfig } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerAdmin } from "../lib/access";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const getRagConfig = protectedProcedure
	.route({
		method: "GET",
		path: "/knowledge/spaces/rag-config",
		tags: ["Knowledge"],
		summary: "Get per-collection RAG configuration",
		description:
			"Returns the persisted RAG config for a knowledge space (model, token limits, confidence threshold, etc.). Returns defaults if never configured.",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
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

		const stored = await getSpaceRagConfig(space.id);
		return (
			stored ?? {
				maxOutputTokens: 1024,
				maxContextTokens: 8000,
				minConfidence: 0.35,
				retrievalLimit: 8,
				includeGraphEdges: true,
				systemPrompt: "",
			}
		);
	});

export const updateRagConfig = protectedProcedure
	.route({
		method: "POST",
		path: "/knowledge/spaces/rag-config",
		tags: ["Knowledge"],
		summary: "Update per-collection RAG configuration",
		description:
			"Persists RAG config for a knowledge space. Applies to all future queries unless overridden per-request.",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			config: z.object({
				maxOutputTokens: z.number().int().min(64).max(4096).default(1024),
				maxContextTokens: z.number().int().min(512).max(16000).default(8000),
				minConfidence: z.number().min(0).max(1).default(0.35),
				retrievalLimit: z.number().int().min(1).max(50).default(8),
				includeGraphEdges: z.boolean().default(true),
				systemPrompt: z.string().max(4000).default(""),
			}),
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

		await upsertSpaceRagConfig(space.id, input.config);

		return { success: true };
	});
