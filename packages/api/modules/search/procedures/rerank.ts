/**
 * AI Re-ranking — uses an LLM (OpenAI) to score each search result's
 * relevance to the query (0–10), then returns results sorted by AI
 * relevance score descending.
 *
 * This is a paid operation (1 credit / 100 kopecks) — uses credit gate.
 */
import { getTypesenseClient } from "@repo/search";
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
import { searchIndexSlugSchema } from "../types";

const hitSchema = z.object({
	document: z.record(z.string(), z.unknown()),
	textMatch: z.string().optional(),
	geoDistanceMeters: z.number().optional(),
});

const rerankedHitSchema = hitSchema.extend({
	aiRelevanceScore: z.number(),
});

export const rerank = protectedProcedure
	.use(creditGate("rerank", CREDIT_RATES.rerank))
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/rerank",
		tags: ["Search"],
		summary: "AI Re-ranking of search results",
		description:
			"Executes a search and uses OpenAI to re-rank the results by semantic relevance " +
			"to the query. Each document is scored 0–10 by the LLM, and results are returned " +
			"sorted by AI relevance score descending. Useful when keyword-based ranking isn't enough.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(2000),
			queryBy: z.string().default("title,description"),
			filterBy: z.string().optional(),
			perPage: z.number().int().min(1).max(250).default(20),
			page: z.number().int().min(1).default(1),
			model: z.string().default("gpt-4o-mini"),
		}),
	)
	.output(
		z.object({
			hits: z.array(rerankedHitSchema),
			found: z.number(),
			page: z.number(),
			perPage: z.number(),
			searchTimeMs: z.number(),
			llmTimeMs: z.number(),
		}),
	)
	.handler(async ({ input, context, ...rest }) => {
		const { creditReservationId } = rest as unknown as CreditGateContext;
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();
		const searchStartTime = Date.now();

		// Phase 1: Standard Typesense search
		const searchParams: Record<string, unknown> = {
			q: input.query,
			query_by: input.queryBy,
			per_page: input.perPage,
			page: input.page,
		};
		if (input.filterBy) searchParams.filter_by = input.filterBy;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const results = (await client
			.collections(index.slug)
			.documents()
			.search(searchParams as any)) as any;

		const searchTimeMs = Date.now() - searchStartTime;

		const hits: any[] = results.hits ?? [];
		const found = results.found ?? 0;

		// Phase 2: Re-rank hits using OpenAI
		const llmStartTime = Date.now();

		try {
			if (hits.length > 0) {
				const OpenAI = await import("openai").then((m) => m.default);
				const openai = new OpenAI();

				// Build a numbered list of documents for the LLM
				const docsList = hits
					.map((hit: any, i: number) => `[${i + 1}] ${JSON.stringify(hit.document)}`)
					.join("\n");

				const systemPrompt = `You are a search relevance judge. Your task is to score each document's relevance to the given query on a scale of 0 to 10, where:
- 0 = completely irrelevant
- 5 = partially relevant
- 10 = perfectly relevant

Respond ONLY with a valid JSON object in this exact format:
{
  "scores": [score1, score2, ...]
}

The scores array must contain exactly ${hits.length} numbers, one per document in the order they were presented.`;

				const userMessage = `Query: ${input.query}\n\nDocuments:\n${docsList}`;

				const completion = await openai.chat.completions.create({
					model: input.model,
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: userMessage },
					] as any,
					response_format: { type: "json_object" },
					temperature: 0.2,
					max_tokens: 500,
				});

				const rawContent = completion.choices[0]?.message?.content ?? "{}";
				let parsed: { scores?: number[] } = {};
				try {
					parsed = JSON.parse(rawContent);
				} catch {
					// If LLM output isn't valid JSON, fall through — scores will be 0
				}

				const scores = parsed.scores ?? [];

				// Attach scores to hits
				const scoredHits = hits.map(
					(hit: any, i: number) =>
						({
							document: hit.document as Record<string, unknown>,
							textMatch: hit.text_match as string | undefined,
							geoDistanceMeters: hit.geo_distance_meters as number | undefined,
							aiRelevanceScore:
								typeof scores[i] === "number"
									? Math.max(0, Math.min(10, scores[i]!))
									: 0,
						}) as const,
				);

				// Sort by AI relevance score descending
				scoredHits.sort(
					(a: { aiRelevanceScore: number }, b: { aiRelevanceScore: number }) =>
						b.aiRelevanceScore - a.aiRelevanceScore,
				);

				await commitFlatFeeUsage({
					reservationId: creditReservationId,
					operation: "rerank",
					provider: "openai",
					model: input.model,
					flatFeeKopecks: CREDIT_RATES.rerank,
				});

				const llmTimeMs = Date.now() - llmStartTime;

				return {
					hits: scoredHits,
					found,
					page: results.page ?? input.page,
					perPage: input.perPage,
					searchTimeMs,
					llmTimeMs,
				};
			}

			// No hits — commit and return empty
			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "rerank",
				provider: "openai",
				model: input.model,
				flatFeeKopecks: CREDIT_RATES.rerank,
			});

			const llmTimeMs = Date.now() - llmStartTime;

			return {
				hits: [],
				found: 0,
				page: input.page,
				perPage: input.perPage,
				searchTimeMs,
				llmTimeMs,
			};
		} catch (err) {
			await releaseCreditReservation(creditReservationId, "error");
			throw err;
		}
	});
