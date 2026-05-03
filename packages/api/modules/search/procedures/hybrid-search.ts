import { logger } from "@repo/logs";
import { getTypesenseClient, generateEmbedding, formatVectorQuery } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { buildHyPEInput, generateHypotheticalQuestions } from "../lib/hype-questions";
import { searchIndexSlugSchema } from "../types";

const hitSchema = z.object({
	document: z.record(z.string(), z.unknown()),
	textMatch: z.number().optional(),
	vectorDistance: z.number().optional(),
	hybridScore: z.number().optional(),
});

export const hybridSearch = protectedProcedure
	.use(creditGate("embedding", CREDIT_RATES.embedding))
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/hybrid-search",
		tags: ["Search"],
		summary: "Hybrid search combining keyword and vector",
		description:
			"Performs both a full-text search and a vector similarity search, combining results using Typesense's native hybrid search with a configurable alpha fusion parameter.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(1000),
			queryBy: z.string().optional(),
			vectorField: z.string().default("embedding"),
			k: z.number().int().min(1).max(250).default(10),
			filterBy: z.string().optional(),
			alpha: z.number().min(0).max(1).default(0.5),
			model: z.string().default("text-embedding-3-small"),
			/** Enable HyPE (Hypothetical Prompt Embeddings) query-time enhancement.
			 * Generates hypothetical search questions from the user query and combines
			 * them with the original query text for embedding, improving vector similarity
			 * matching against HyPE-enhanced document embeddings. Adds ~100ms latency. */
			enableHyPE: z.boolean().default(false),
			/** Number of hypothetical questions to generate when HyPE is enabled (1-10, default 3). */
			hyPEQuestionsCount: z.number().int().min(1).max(10).default(3),
		}),
	)
	.output(
		z.object({
			found: z.number(),
			hits: z.array(hitSchema),
			searchTimeMs: z.number(),
			embedding: z.object({
				model: z.string(),
				dimensions: z.number(),
				tokens: z.number(),
			}),
		}),
	)
	.handler(async ({ input, context, ...rest }) => {
		const { creditReservationId } = rest as unknown as CreditGateContext;
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		let embeddingText = input.query;

		// HyPE query-time enhancement: generate hypothetical questions and embed
		// them alongside the user query for better vector similarity matching
		// against HyPE-enhanced document embeddings.
		if (input.enableHyPE) {
			const questions = await generateHypotheticalQuestions(
				input.query,
				input.hyPEQuestionsCount,
			);
			if (questions.length > 0) {
				embeddingText = buildHyPEInput(input.query, questions);
				logger.info(
					{
						questionCount: questions.length,
						slug: input.slug,
					},
					"hybridSearch: HyPE query-time enhancement applied",
				);
			}
		}

		let embedding: Awaited<ReturnType<typeof generateEmbedding>>;
		try {
			embedding = await generateEmbedding(embeddingText, input.model);
		} catch (err) {
			await releaseCreditReservation(creditReservationId);
			throw err;
		}
		const vectorQuery = formatVectorQuery(embedding.vector, input.vectorField, input.k);

		const client = getTypesenseClient();
		const searchParams: Record<string, unknown> = {
			q: input.query,
			query_by: input.queryBy ?? "title,description",
			vector_query: vectorQuery,
			per_page: input.k,
			hybrid_search: true,
			alpha: input.alpha,
		};

		if (input.filterBy) {
			searchParams.filter_by = input.filterBy;
		}

		const results = (await client
			.collections(index.slug)
			.documents()
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.search(searchParams as any)) as any;

		await commitFlatFeeUsage({
			reservationId: creditReservationId,
			operation: "embedding",
			provider: "openai",
			model: input.model,
			flatFeeKopecks: CREDIT_RATES.embedding,
		});

		return {
			found: results.found ?? 0,
			hits: ((results.hits ?? []) as any[]).map((hit: any) => ({
				document: hit.document as Record<string, unknown>,
				textMatch: hit.text_match_info?.score as number | undefined,
				vectorDistance: hit.vector_distance as number | undefined,
				hybridScore: hit._hybrid_score as number | undefined,
			})),
			searchTimeMs: results.search_time_ms ?? 0,
			embedding: {
				model: embedding.model,
				dimensions: embedding.dimensions,
				tokens: embedding.tokens,
			},
		};
	});
