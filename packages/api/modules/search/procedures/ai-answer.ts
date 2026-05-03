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

const sourceSchema = z.object({
	document: z.record(z.string(), z.unknown()),
	textMatch: z.string().optional(),
});

/**
 * Zero-click AI Answer — searches the index, retrieves the top document
 * snippets, and generates a concise answer from the context using OpenAI.
 *
 * No conversation history management (zero-click pattern).
 */
export const aiAnswer = protectedProcedure
	.use(creditGate("ai_answer", CREDIT_RATES.ai_answer))
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/ai-answer",
		tags: ["Search"],
		summary: "Zero-click AI Answer from search results",
		description:
			"Searches the index for relevant documents and uses OpenAI to generate " +
			"a short, concise answer based on the retrieved context. No conversation " +
			"history is maintained — each call is independent (zero-click).",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(5000),

			model: z.string().default("gpt-4o-mini"),

			queryBy: z.string().optional(),
			filterBy: z.string().optional(),
			perPage: z.number().int().min(1).max(50).default(5),
		}),
	)
	.output(
		z.object({
			answer: z.string(),
			sources: z.array(sourceSchema),
			found: z.number(),
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

		// Phase 1: search for relevant documents
		const searchParams: Record<string, unknown> = {
			q: input.query,
			query_by: input.queryBy ?? "title,description",
			per_page: input.perPage,
		};
		if (input.filterBy) searchParams.filter_by = input.filterBy;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const results = (await client
			.collections(index.slug)
			.documents()
			.search(searchParams as any)) as any;

		const searchTimeMs = Date.now() - searchStartTime;

		const hits: any[] = results.hits ?? [];
		const sources = hits.map((hit: any) => ({
			document: hit.document as Record<string, unknown>,
			textMatch: hit.text_match_info?.snippet as string | undefined,
		}));

		// Phase 2: build context from sources and generate answer with OpenAI
		const contextChunks = sources.map(
			(s: { document: Record<string, unknown> }, i: number) =>
				`[${i + 1}] ${JSON.stringify(s.document)}`,
		);

		const llmStartTime = Date.now();

		let answer: string;
		try {
			const OpenAI = await import("openai").then((m) => m.default);
			const openai = new OpenAI();
			const completion = await openai.chat.completions.create({
				model: input.model,
				messages: [
					{
						role: "system",
						content:
							"You are a helpful search assistant. Answer the user's question based on the provided document context. Keep your answer concise — no more than a few sentences. Cite sources using [N] notation. If the context does not contain enough information to answer, say so honestly.",
					},
					{
						role: "user",
						content: `Context:\n${contextChunks.join("\n")}\n\nQuestion: ${input.query}`,
					},
				] as any,
				max_tokens: 500,
				temperature: 0.3,
			});
			answer = completion.choices[0]?.message?.content ?? "Unable to generate an answer.";

			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "ai_answer",
				provider: "openai",
				model: input.model,
				flatFeeKopecks: CREDIT_RATES.ai_answer,
			});
		} catch {
			await releaseCreditReservation(creditReservationId, "error");
			answer = "AI Answer is unavailable at this moment.";
		}

		const llmTimeMs = Date.now() - llmStartTime;

		return {
			answer,
			sources,
			found: results.found ?? 0,
			searchTimeMs,
			llmTimeMs,
		};
	});
