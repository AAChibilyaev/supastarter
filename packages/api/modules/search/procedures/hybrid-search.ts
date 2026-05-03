import { getTypesenseClient, generateEmbedding, formatVectorQuery } from "@repo/search";
import { z } from "zod";

import { logger } from "@repo/logs";
import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import {
	buildHyPEInput,
	generateHypotheticalQuestions,
} from "../lib/hype-questions";
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
	\t.input(
	\t\tz.object({
	\t\t\torganizationId: z.string(),
	\t\t\tslug: searchIndexSlugSchema,
	\t\t\tquery: z.string().min(1).max(1000),
	\t\t\tqueryBy: z.string().optional(),
	\t\t\tvectorField: z.string().default("embedding"),
	\t\t\tk: z.number().int().min(1).max(250).default(10),
	\t\t\tfilterBy: z.string().optional(),
	\t\t\talpha: z.number().min(0).max(1).default(0.5),
	\t\t\tmodel: z.string().default("text-embedding-3-small"),
	\t\t\t/** Enable HyPE (Hypothetical Prompt Embeddings) query-time enhancement.
	\t\t\t * Generates hypothetical search questions from the user query and combines
	\t\t\t * them with the original query text for embedding, improving vector similarity
	\t\t\t * matching against HyPE-enhanced document embeddings. Adds ~100ms latency. */
	\t\t\tenableHyPE: z.boolean().default(false),
	\t\t\t/** Number of hypothetical questions to generate when HyPE is enabled (1-10, default 3). */
	\t\t\thyPEQuestionsCount: z.number().int().min(1).max(10).default(3),
	\t\t}),
	\t)
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
	\t.handler(async ({ input, context, ...rest }) => {
	\t\tconst { creditReservationId } = rest as unknown as CreditGateContext;
	\t\tawait requireOrganizationMember(input.organizationId, context.user.id);
	\t\tconst index = await requireSearchIndex(input.organizationId, input.slug);

	\t\tlet embeddingText = input.query;

	\t\t// HyPE query-time enhancement: generate hypothetical questions and embed
	\t\t// them alongside the user query for better vector similarity matching
	\t\t// against HyPE-enhanced document embeddings.
	\t\tif (input.enableHyPE) {
	\t\t\tconst questions = await generateHypotheticalQuestions(
	\t\t\t\tinput.query,
	\t\t\t\tinput.hyPEQuestionsCount,
	\t\t\t);
	\t\t\tif (questions.length > 0) {
	\t\t\t\tembeddingText = buildHyPEInput(input.query, questions);
	\t\t\t\tlogger.info(
	\t\t\t\t\t{
	\t\t\t\t\t\tquestionCount: questions.length,
	\t\t\t\t\t\tslug: input.slug,
	\t\t\t\t\t},
	\t\t\t\t\t"hybridSearch: HyPE query-time enhancement applied",
	\t\t\t\t);
	\t\t\t}
	\t\t}

	\t\tlet embedding: Awaited<ReturnType<typeof generateEmbedding>>;
	\t\ttry {
	\t\t\tembedding = await generateEmbedding(embeddingText, input.model);
	\t\t} catch (err) {
	\t\t\tawait releaseCreditReservation(creditReservationId);
	\t\t\tthrow err;
	\t\t}
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
