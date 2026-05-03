import { generateEmbeddings } from "@repo/search";
import type { EmbeddingResult } from "@repo/search";
/**
 * Custom Embedding — generates embeddings for arbitrary text(s) using
 * the configured embedding provider.
 *
 * This is a paid operation (1 credit / 100 kopecks per call) — uses credit gate.
 * Returns actual token count in metadata for transparency.
 */
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";

export const customEmbedding = protectedProcedure
	.use(creditGate("embedding_tokens_1k", CREDIT_RATES.embedding_tokens_1k))
	.route({
		method: "POST",
		path: "/search/embeddings/custom",
		tags: ["Search"],
		summary: "Custom Embedding",
		description:
			"Generates embeddings for the provided text(s) using the configured embedding provider. " +
			"Accepts a single string or an array of strings. Returns vectors, dimensions, and token " +
			"counts in the response metadata.",
	})
	.input(
		z.object({
			text: z.string().or(z.array(z.string())),
			model: z.string().optional(),
		}),
	)
	.output(
		z.object({
			embeddings: z.array(
				z.object({
					vector: z.array(z.number()),
					dimensions: z.number(),
					tokens: z.number(),
				}),
			),
			totalTokens: z.number(),
			model: z.string(),
		}),
	)
	.handler(async ({ input, context: { ...rest } }) => {
		const { creditReservationId } = rest as unknown as CreditGateContext;

		try {
			const texts: string[] = Array.isArray(input.text) ? input.text : [input.text];

			const results: EmbeddingResult[] = await generateEmbeddings(texts, input.model);

			const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);
			const model = results[0]?.model ?? "text-embedding-3-small";

			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "embedding_tokens_1k",
				provider: "openai",
				model,
				flatFeeKopecks: CREDIT_RATES.embedding_tokens_1k,
			});

			return {
				embeddings: results.map((r) => ({
					vector: r.vector,
					dimensions: r.dimensions,
					tokens: r.tokens,
				})),
				totalTokens,
				model,
			};
		} catch (err) {
			await releaseCreditReservation(creditReservationId, "error");
			throw err;
		}
	});
