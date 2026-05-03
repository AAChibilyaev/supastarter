import { tool } from "@repo/ai";
import { logger } from "@repo/logs";
import { z } from "zod";

import { retrieveKnowledge } from "../../../knowledge/lib/retrieval";

const inputSchema = z.object({
	query: z.string().describe("Question or topic to search for in the knowledge base"),
});

export function createSearchKnowledgeTool(knowledgeSpaceId: string) {
	return tool({
		description:
			"Search the brand's expert knowledge base for sports and fashion expertise: product recommendations by activity, technical explanations, buying guides, size guides, and category knowledge. Use this for expert advice questions.",
		inputSchema,
		execute: async (input) => {
			try {
				const result = await retrieveKnowledge({
					knowledgeSpaceId,
					query: input.query,
					limit: 5,
				});
				return {
					found: result.chunks.length,
					content: result.chunks.map((c) => ({
						text: c.text,
						source: c.documentTitle,
						relevance: c.score,
					})),
				};
			} catch (err) {
				logger.warn({ err, query: input.query }, "search_knowledge tool failed");
				return { found: 0, content: [], error: "knowledge_unavailable" };
			}
		},
	});
}
