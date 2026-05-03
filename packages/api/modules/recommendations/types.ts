import { z } from "zod";

/**
 * Recommendation result entry returned from Neo4j queries.
 * All numeric values are transformed to strings over oRPC.
 */
export const recommendationResultSchema = z.object({
	id: z.string(),
	title: z.string(),
	score: z.number(),
	similarityType: z.string().optional(),
	reasonCount: z.number().optional(),
});

export type RecommendationResult = z.infer<typeof recommendationResultSchema>;
