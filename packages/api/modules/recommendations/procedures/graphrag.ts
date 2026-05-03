import { ORPCError } from "@orpc/client";
import { generateText, textModel } from "@repo/ai";
import { logger } from "@repo/logs";
import {
	getGraphRagRecommendations,
	getMultiSeedGraphRagRecommendations,
	verifyConnection,
} from "@repo/recommendations";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const graphrag = protectedProcedure
	.route({
		method: "POST",
		path: "/recommendations/graphrag",
		tags: ["Recommendations"],
		summary: "GraphRAG recommendations with LLM explanations",
		description:
			"Returns LLM-powered product recommendations with natural language explanations. " +
			"Uses Neo4j graph connections (similar, same-category, also-bought) as context for OpenAI. " +
			"Falls back to graph data without LLM explanations if OpenAI is unavailable.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			productId: z.string(),
			additionalSeedIds: z.array(z.string()).max(20).optional(),
			limit: z.coerce.number().min(1).max(50).default(8),
			preferenceHint: z.string().max(200).optional(),
		}),
	)
	.output(
		z.object({
			recommendations: z.array(
				z.object({
					id: z.string(),
					title: z.string(),
					explanation: z.string(),
					relevanceScore: z.number().min(0).max(1),
					connectionType: z.string(),
				}),
			),
			summary: z.string(),
			context: z.object({
				productTitle: z.string(),
				productCategory: z.string(),
				neighborCount: z.number(),
			}),
			llmUsed: z.boolean(),
			neo4jConnected: z.boolean(),
		}),
	)
	.handler(
		async ({
			input: { organizationId, productId, additionalSeedIds, limit, preferenceHint },
			context: { user },
		}) => {
			await requireOrganizationAccess(organizationId, user.id);

			try {
				const health = await verifyConnection();
				if (!health.connected) {
					return {
						recommendations: [],
						summary: "Neo4j graph database is not connected.",
						context: { productTitle: "Unknown", productCategory: "", neighborCount: 0 },
						llmUsed: false,
						neo4jConnected: false,
					};
				}

				const llmFn = async (prompt: string): Promise<string> => {
					const response = await generateText({
						model: textModel,
						prompt,
					});
					return response.text;
				};

				const result = await getGraphRagRecommendations(
					{
						productId,
						additionalSeedIds,
						limit,
						preferenceHint,
					},
					undefined,
					llmFn,
				);

				return {
					...result,
					neo4jConnected: true,
				};
			} catch (err) {
				logger.error({ err, productId }, "Failed to generate GraphRAG recommendations");
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Recommendation engine unavailable",
				});
			}
		},
	);

export const graphragMultiSeed = protectedProcedure
	.route({
		method: "POST",
		path: "/recommendations/graphrag/multi-seed",
		tags: ["Recommendations"],
		summary: "Multi-seed GraphRAG recommendations with LLM explanations",
		description:
			"Returns LLM-powered recommendations from multiple seed products (e.g. user's recently viewed or purchased items). " +
			"Each seed contributes related products from the Neo4j graph, and the LLM selects the best with natural language explanations.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			productIds: z.array(z.string()).min(1).max(20),
			limit: z.coerce.number().min(1).max(50).default(8),
			preferenceHint: z.string().max(200).optional(),
		}),
	)
	.output(
		z.object({
			recommendations: z.array(
				z.object({
					id: z.string(),
					title: z.string(),
					explanation: z.string(),
					relevanceScore: z.number().min(0).max(1),
					connectedTo: z.array(z.string()),
				}),
			),
			summary: z.string(),
			llmUsed: z.boolean(),
			neo4jConnected: z.boolean(),
		}),
	)
	.handler(
		async ({
			input: { organizationId, productIds, limit, preferenceHint },
			context: { user },
		}) => {
			await requireOrganizationAccess(organizationId, user.id);

			try {
				const health = await verifyConnection();
				if (!health.connected) {
					return {
						recommendations: [],
						summary: "Neo4j graph database is not connected.",
						llmUsed: false,
						neo4jConnected: false,
					};
				}

				const llmFn = async (prompt: string): Promise<string> => {
					const response = await generateText({
						model: textModel,
						prompt,
					});
					return response.text;
				};

				const result = await getMultiSeedGraphRagRecommendations(
					{
						productIds,
						limit,
						preferenceHint,
					},
					undefined,
					llmFn,
				);

				return {
					...result,
					neo4jConnected: true,
				};
			} catch (err) {
				logger.error(
					{ err, productIds },
					"Failed to generate multi-seed GraphRAG recommendations",
				);
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Recommendation engine unavailable",
				});
			}
		},
	);
