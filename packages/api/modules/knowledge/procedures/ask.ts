import { ORPCError } from "@orpc/client";
import { generateText, textModel } from "@repo/ai";
import { getKnowledgeSpaceBySlug } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireKnowledgeOwnerMember } from "../lib/access";
import { retrieveKnowledge } from "../lib/retrieval";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const ask = protectedProcedure
	.route({
		method: "POST",
		path: "/knowledge/ask",
		tags: ["Knowledge"],
		summary: "Ask question with hybrid retrieval",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			query: z.string().min(3).max(1200),
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

		const retrieved = await retrieveKnowledge({
			knowledgeSpaceId: space.id,
			query: input.query,
			limit: 8,
		});
		if (retrieved.chunks.length === 0) {
			return {
				answer:
					"I could not find supporting knowledge in this space yet. Upload data sources or files first.",
				citations: [],
				graphEdges: [],
			};
		}

		const contextText = retrieved.chunks
			.map(
				(chunk, index) =>
					`[${index + 1}] ${chunk.documentTitle}\nScore: ${chunk.score.toFixed(3)}\n${chunk.text}`,
			)
			.join("\n\n");

		const response = await generateText({
			model: textModel,
			prompt: [
				"You are AACsearch assistant.",
				"Answer using only provided context snippets.",
				"If context is insufficient, explicitly say so.",
				"Always cite snippet numbers in the answer.",
				`Question: ${input.query}`,
				`Context:\n${contextText}`,
			].join("\n\n"),
		});

		return {
			answer: response.text,
			citations: retrieved.chunks.map((chunk, index) => ({
				id: chunk.id,
				documentId: chunk.documentId,
				documentTitle: chunk.documentTitle,
				snippet: chunk.text.slice(0, 300),
				sourceIndex: index + 1,
				score: chunk.score,
			})),
			graphEdges: retrieved.graphEdges,
		};
	});
