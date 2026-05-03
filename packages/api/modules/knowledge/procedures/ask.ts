import { ORPCError } from "@orpc/client";
import { generateText, openai, textModel } from "@repo/ai";
import { getKnowledgeSpaceBySlug } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireKnowledgeOwnerMember } from "../lib/access";
import {
	type RagConfig,
	FALLBACK_LOW_CONFIDENCE,
	buildDefaultSystemPrompt,
	buildPromptTemplate,
	buildRagContext,
	calculateConfidence,
	mergeRagConfig,
	validateQueryTokens,
} from "../lib/rag-pipeline";
import { retrieveKnowledge } from "../lib/retrieval";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const ask = protectedProcedure
	.use(creditGate("rag_answer", CREDIT_RATES.rag_answer))
	.route({
		method: "POST",
		path: "/knowledge/ask",
		tags: ["Knowledge"],
		summary: "Ask question with hybrid retrieval and full RAG pipeline",
		description:
			"Non-streaming RAG with hybrid retrieval, confidence scoring, token limits, custom prompts, multi-turn history, and low-confidence fallback.",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			query: z.string().min(3).max(1200),
			/** Custom system prompt override */
			systemPrompt: z.string().max(4000).optional(),
			/** Per-request RAG config overrides */
			ragConfig: z
				.object({
					maxOutputTokens: z.number().int().min(64).max(4096).optional(),
					maxContextTokens: z.number().int().min(512).max(16000).optional(),
					minConfidence: z.number().min(0).max(1).optional(),
					retrievalLimit: z.number().int().min(1).max(50).optional(),
					includeGraphEdges: z.boolean().optional(),
				})
				.optional(),
			/** Conversation history for multi-turn support */
			history: z
				.array(
					z.object({
						role: z.enum(["user", "assistant"]),
						content: z.string(),
					}),
				)
				.max(50)
				.optional(),
		}),
	)
	.handler(async ({ input, context, ...rest }) => {
		const { creditReservationId } = rest as unknown as CreditGateContext;
		const { user } = context;
		await requireKnowledgeOwnerMember(
			{
				ownerType: input.ownerType,
				ownerId: input.ownerId,
			},
			user,
		);

		// 1. Validate query token count
		const queryError = validateQueryTokens(input.query);
		if (queryError) {
			await releaseCreditReservation(creditReservationId);
			throw new ORPCError("BAD_REQUEST", { message: queryError });
		}

		// 2. Resolve knowledge space
		const scope = {
			ownerType: input.ownerType,
			organizationId: input.ownerType === "ORGANIZATION" ? input.ownerId : undefined,
			userId: input.ownerType === "USER" ? input.ownerId : undefined,
		};
		const space = await getKnowledgeSpaceBySlug(scope, input.spaceSlug);
		if (!space) {
			await releaseCreditReservation(creditReservationId);
			throw new ORPCError("NOT_FOUND", { message: "Knowledge space not found" });
		}

		// 3. Merge config with defaults
		const config: RagConfig = mergeRagConfig({
			...input.ragConfig,
			systemPrompt: input.systemPrompt ?? "",
		});

		// 4. Retrieve knowledge
		const retrieved = await retrieveKnowledge({
			knowledgeSpaceId: space.id,
			query: input.query,
			limit: config.retrievalLimit,
		});

		// 5. Confidence check — return fallback if low
		const confidence = calculateConfidence(retrieved.chunks);
		const isLowConfidence = retrieved.chunks.length === 0 || confidence < config.minConfidence;

		if (isLowConfidence) {
			await releaseCreditReservation(creditReservationId);
			return {
				answer: FALLBACK_LOW_CONFIDENCE,
				citations: [],
				graphEdges: [],
				confidence,
				isFallback: true,
			};
		}

		// 6. Build context within token budget
		const { contextText, usedChunks } = buildRagContext(
			retrieved.chunks,
			config.maxContextTokens,
		);

		// 7. Build system prompt
		const systemPromptText =
			config.systemPrompt ||
			buildDefaultSystemPrompt(config.includeGraphEdges && retrieved.graphEdges.length > 0);

		// 8. Build prompt with potential template variables
		const promptText = buildPromptTemplate(systemPromptText, {
			question: input.query,
			context: contextText,
			chunks: usedChunks.map((c) => `[${c.documentTitle}] ${c.text}`).join("\n"),
		});

		// 9. Build conversation messages
		const conversationMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
		if (input.history) {
			conversationMessages.push(...input.history);
		}
		conversationMessages.push({
			role: "user",
			content: `Question: ${input.query}\n\nContext:\n${contextText}`,
		});

		// 10. Generate the answer
		let response: Awaited<ReturnType<typeof generateText>>;
		try {
			response = await generateText({
				model: config.model ? openai(config.model) : textModel,
				messages: [
					{ role: "system", content: promptText },
					...conversationMessages.map((msg) => ({
						role: msg.role as "user" | "assistant",
						content: msg.content,
					})),
				],
				maxTokens: config.maxOutputTokens,
			});
		} catch (err) {
			await releaseCreditReservation(creditReservationId);
			logger.error("[RAG] Generation failed", { error: err });
			throw err;
		}

		// 11. Commit flat fee usage
		await commitFlatFeeUsage({
			reservationId: creditReservationId,
			operation: "rag_answer",
			provider: "aacsearch",
			model: "rag",
			flatFeeKopecks: CREDIT_RATES.rag_answer,
		});

		return {
			answer: response.text,
			citations: usedChunks.map((chunk, index) => ({
				id: chunk.id,
				documentId: chunk.documentId,
				documentTitle: chunk.documentTitle,
				snippet: chunk.text.slice(0, 300),
				sourceIndex: index + 1,
				score: chunk.score,
			})),
			graphEdges: config.includeGraphEdges ? retrieved.graphEdges : [],
			confidence,
			isFallback: false,
		};
	});
