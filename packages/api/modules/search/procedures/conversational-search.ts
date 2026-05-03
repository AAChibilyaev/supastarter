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

export const conversationalSearch = protectedProcedure
	.use(creditGate("conversational_search_llm", BigInt(500)))
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/conversational-search",
		tags: ["Search"],
		summary: "RAG conversational search using OpenAI",
		description:
			"Searches the index for relevant documents, then uses OpenAI to generate a contextual answer with cited sources.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(5000),
			history: z.array(messageSchema).max(20).default([]),
			model: z.string().default("gpt-4o-mini"),
			queryBy: z.string().optional(),
			filterBy: z.string().optional(),
		}),
	)
	.output(
		z.object({
			answer: z.string(),
			sources: z.array(sourceSchema),
			found: z.number(),
			searchTimeMs: z.number(),
		}),
	)
	.handler(async ({ input, context, ...rest }) => {
		const { creditReservationId } = rest as unknown as CreditGateContext;
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();

		// Phase 1: search for relevant documents
		const searchParams: Record<string, unknown> = {
			q: input.query,
			query_by: input.queryBy ?? "title,description",
			per_page: 5,
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
			textMatch: hit.text_match as string | undefined,
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
			await commitFlatFeeUsage(context, creditReservationId, BigInt(500));
		} catch {
			answer = "Conversational search is unavailable at this moment.";
			await releaseCreditReservation(context, creditReservationId);
		}

		return {
			answer,
			sources,
			found: results.found ?? 0,
			searchTimeMs: results.search_time_ms ?? 0,
		};
	});
