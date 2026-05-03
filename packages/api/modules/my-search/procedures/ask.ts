import { ORPCError } from "@orpc/client";
import { generateText, textModel } from "@repo/ai";
import { getPersonalSearchIndexById } from "@repo/database";
import { aliasName, generateEmbedding, searchDocuments } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireOrganizationAccess } from "../lib/access";

const EMBEDDING_MODEL = "text-embedding-3-small";

const sourceSchema = z.object({
	chunkId: z.string(),
	fileId: z.string(),
	filename: z.string(),
	excerpt: z.string(),
	score: z.number(),
});

export const ask = protectedProcedure
	.use(creditGate("my_search_rag", CREDIT_RATES.my_search_rag))
	.route({
		method: "POST",
		path: "/my-search/indexes/{id}/ask",
		tags: ["My Search"],
		summary: "Ask AI a question about indexed documents",
		description: "Uses RAG to answer a question over the personal search index content.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
			question: z.string().min(3).max(1200),
			topK: z.number().int().min(1).max(20).optional().default(5),
		}),
	)
	.output(
		z.object({
			answer: z.string(),
			sources: z.array(sourceSchema),
		}),
	)
	.handler(async ({ input, context: { user, ...rest } }) => {
		const { creditReservationId } = rest as unknown as CreditGateContext;

		try {
			await requireOrganizationAccess(input.organizationId, user.id);

			const index = await getPersonalSearchIndexById(input.organizationId, input.id);
			if (!index) {
				throw new ORPCError("NOT_FOUND", { message: "Search index not found" });
			}

			const chunkAlias = `${aliasName(input.organizationId, index.slug)}_chunks`;

			// 1. Generate embedding for the question
			let embeddingVector: number[] | null = null;
			try {
				const embResult = await generateEmbedding(input.question, EMBEDDING_MODEL);
				embeddingVector = embResult.vector;
			} catch {
				// Fall back to BM25-only search if embedding fails
			}

			// 2. Search the index for relevant chunks
			const results = await searchDocuments({
				alias: chunkAlias,
				tenantId: input.organizationId,
				q: input.question,
				queryBy: "content",
				highlightFields: "content",
				filterBy: `index_id:=${index.slug}`,
				perPage: input.topK,
				page: 1,
				...(embeddingVector
					? {
							vectorQuery: `embedding:([${embeddingVector.join(",")}], k:${input.topK})`,
						}
					: {}),
			});

			if (results.hits.length === 0) {
				await releaseCreditReservation(creditReservationId, "cancelled");
				return {
					answer:
						"No relevant content found in this index yet. Upload documents or add URLs first.",
					sources: [],
				};
			}

			// 3. Build context from retrieved chunks
			const chunks = results.hits.map((hit: unknown) => {
				const h = hit as Record<string, unknown>;
				const doc = (h.document ?? {}) as Record<string, unknown>;
				const textMatchInfo = h.text_match_info as Record<string, unknown> | undefined;
				const highlights = (h.highlights as Array<Record<string, unknown>>) ?? [];
				const highlightSnippet = (highlights[0]?.snippet as string | undefined) ?? undefined;
				const content = (doc.content as string) ?? "";

				return {
					chunkId: (doc.chunk_id as string) ?? "",
					fileId: (doc.file_id as string) ?? "",
					filename: (doc.filename as string) ?? "",
					content,
					excerpt: highlightSnippet ?? content.slice(0, 300),
					score: (textMatchInfo?.score as number) ?? 0,
				};
			});

			const contextText = chunks
				.map((chunk, index) => `[${index + 1}] ${chunk.filename}\n${chunk.content}`)
				.join("\n\n");

			// 4. Generate answer with OpenAI
			const response = await generateText({
				model: textModel,
				prompt: [
					"You are AACsearch assistant. Answer the question using only the provided document snippets.",
					"If the context is insufficient, say so explicitly.",
					"Cite snippet numbers (e.g. [1], [2]) when referencing content.",
					`Question: ${input.question}`,
					`Context:\n${contextText}`,
				].join("\n\n"),
			});

			// 5. Commit flat-fee usage on success
			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "my_search_rag",
				provider: "aacsearch",
				model: "rag",
				flatFeeKopecks: CREDIT_RATES.my_search_rag,
			});

			return {
				answer: response.text,
				sources: chunks.map((chunk) => ({
					chunkId: chunk.chunkId,
					fileId: chunk.fileId,
					filename: chunk.filename,
					excerpt: chunk.excerpt,
					score: chunk.score,
				})),
			};
		} catch (err) {
			await releaseCreditReservation(creditReservationId);
			throw err;
		}
	});
