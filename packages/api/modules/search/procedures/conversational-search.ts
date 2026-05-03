import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const messageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string(),
});

const sourceSchema = z.object({
	document: z.record(z.string(), z.unknown()),
	textMatch: z.string().optional(),
});

/**
 * Conversational search using Typesense native RAG (v0.26+ conversation API).
 *
 * When a conversationModelId is provided, Typesense handles the entire RAG pipeline:
 * document retrieval → LLM context injection → answer generation.
 * Conversation history is managed automatically via conversation_id.
 *
 * Falls back to the manual OpenAI RAG approach when no conversationModelId is given.
 */
export const conversationalSearch = protectedProcedure
	.use(creditGate("rag_answer", BigInt(300)))
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/conversational-search",
		tags: ["Search"],
		summary: "RAG conversational search (Typesense native or manual OpenAI)",
		description:
			"Searches the index and generates a contextual answer with cited sources. " +
			"When conversationModelId is provided, uses Typesense native RAG with the registered " +
			"conversation model. Otherwise falls back to manual OpenAI-based RAG.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(5000),

			// Typesense native RAG params
			conversationModelId: z
				.string()
				.optional()
				.describe("Typesense conversation model ID (enables native RAG)"),
			conversationId: z
				.string()
				.optional()
				.describe("Existing conversation ID to continue a session"),

			// Fallback manual RAG params
			history: z.array(messageSchema).max(20).default([]),
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
			conversationId: z.string().optional(),
			conversationHistory: z.array(messageSchema).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);
		const { creditReservationId } = context as unknown as CreditGateContext;

		const client = getTypesenseClient();
		const searchStartTime = Date.now();

		if (input.conversationModelId) {
			// === Typesense Native RAG ===
			// Typesense handles document retrieval, context injection, and LLM answer generation.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const params: Record<string, unknown> = {
				q: input.query,
				query_by: input.queryBy ?? "title,description",
				per_page: input.perPage,
				conversation_model_id: input.conversationModelId,
			};

			if (input.filterBy) params.filter_by = input.filterBy;
			if (input.conversationId) params.conversation_id = input.conversationId;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const results = (await client
				.collections(index.slug)
				.documents()
				.search(params as any)) as any;

			const searchTimeMs = Date.now() - searchStartTime;

			const hits: any[] = results.hits ?? [];
			const conversationHistory: Array<Record<string, unknown>> =
				results.conversation_history ?? [];

			// Extract the LLM answer — it's the last assistant turn in conversation_history
			let answer = "Unable to generate an answer.";
			const assistantTurns = conversationHistory.filter(
				(turn: Record<string, unknown>) => turn.role === "assistant",
			);
			if (assistantTurns.length > 0) {
				answer = (assistantTurns[assistantTurns.length - 1].content ?? answer) as string;
			}

			// Extract or generate a conversation_id from the response
			const responseConversationId =
				(results.conversation_id as string | undefined) ??
				input.conversationId ??
				undefined;

			// Commit flat-fee usage on success (Typesense native RAG)
			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "rag_answer",
				provider: "aacsearch",
				model: "ai_answer",
				flatFeeKopecks: BigInt(300),
			});

			return {
				answer,
				sources: hits.map((hit: any) => ({
					document: hit.document as Record<string, unknown>,
					textMatch: (hit.text_match_info?.snippet ?? hit.highlight?.snippet) as
						| string
						| undefined,
				})),
				found: results.found ?? 0,
				searchTimeMs,
				conversationId: responseConversationId,
				conversationHistory: conversationHistory.map((turn: Record<string, unknown>) => ({
					role: (turn.role as "user" | "assistant") ?? "assistant",
					content: (turn.content ?? "") as string,
				})),
			};
		}

		// === Legacy Manual RAG (fallback) ===
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

		const messages = [
			{
				role: "system",
				content:
					"You are a helpful search assistant. Answer the user's question based on the provided document context. Cite sources using [N] notation. If the context does not contain enough information, say so honestly.",
			},
			...input.history.map((m) => ({ role: m.role, content: m.content })),
			{
				role: "user",
				content: `Context:\n${contextChunks.join("\n")}\n\nQuestion: ${input.query}`,
			},
		];

		let answer: string;
		try {
			const OpenAI = await import("openai").then((m) => m.default);
			const openai = new OpenAI();
			const completion = await openai.chat.completions.create({
				model: input.model,
				messages: messages as any,
				max_tokens: 1000,
				temperature: 0.3,
			});
			answer = completion.choices[0]?.message?.content ?? "Unable to generate an answer.";

			// Commit flat-fee usage on successful manual RAG
			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "rag_answer",
				provider: "openai",
				model: input.model,
				flatFeeKopecks: BigInt(300),
			});
		} catch {
			await releaseCreditReservation(creditReservationId, "error");
			answer = "Conversational search is unavailable at this moment.";
		}

		const searchTimeMs = Date.now() - searchStartTime;

		return {
			answer,
			sources,
			found: results.found ?? 0,
			searchTimeMs,
		};
	});
