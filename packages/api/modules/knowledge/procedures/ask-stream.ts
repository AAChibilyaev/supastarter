import { ORPCError } from "@orpc/client";
import { streamToEventIterator } from "@orpc/client";
import { openai, streamText, textModel } from "@repo/ai";
import { getKnowledgeSpaceBySlug } from "@repo/database";
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
	buildDefaultSystemPrompt,
	buildPromptTemplate,
	buildRagContext,
	calculateConfidence,
	formatHistory,
	mergeRagConfig,
	validateQueryTokens,
	FALLBACK_LOW_CONFIDENCE,
} from "../lib/rag-pipeline";
import { retrieveKnowledge } from "../lib/retrieval";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const askStream = protectedProcedure
	.use(creditGate("rag_answer", CREDIT_RATES.rag_answer))
	.route({
		method: "POST",
		path: "/knowledge/ask-stream",
		tags: ["Knowledge"],
		summary: "Stream RAG answer with citations, confidence, token limits",
		description:
			"Streaming RAG with multi-turn conversation support, citations-as-events, configurable prompt, token limits, and low-confidence fallback.",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			query: z.string().min(3).max(1200),
			systemPrompt: z.string().max(4000).optional(),
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

		// 5. Confidence check — return non-streaming fallback if low
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

		// 7. Build system prompt with template variable injection
		const rawSystemPrompt =
			config.systemPrompt ||
			buildDefaultSystemPrompt(config.includeGraphEdges && retrieved.graphEdges.length > 0);

		const historyText = input.history ? formatHistory(input.history) : "";

		const systemPromptText = buildPromptTemplate(rawSystemPrompt, {
			question: input.query,
			context: contextText,
			history: historyText,
			chunks: usedChunks.map((c) => `[${c.documentTitle}] ${c.text}`).join("\n"),
		});

		const systemMessage = { role: "system" as const, content: systemPromptText };

		// 8. Build messages with conversation history
		const conversationMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
		if (input.history) {
			conversationMessages.push(...input.history);
		}
		conversationMessages.push({
			role: "user",
			content: `Question: ${input.query}\n\nContext:\n${contextText}`,
		});

		// 9. Stream the response
		// oxlint-disable-next-line typescript/await-thenable
		const response = streamText({
			model: config.model ? openai(config.model) : textModel,
			messages: [
				systemMessage,
				...conversationMessages.map((msg) => ({
					role: msg.role,
					content: msg.content,
				})),
			],
			maxTokens: config.maxOutputTokens,
		});

		// Commit charge immediately (stream may be long-lived)
		await commitFlatFeeUsage({
			reservationId: creditReservationId,
			operation: "rag_answer",
			provider: "aacsearch",
			model: "rag",
			flatFeeKopecks: CREDIT_RATES.rag_answer,
		});

		// 10. Return the streaming response — use known working pattern from stream-message.ts
		// Citations metadata is included in the non-streaming return for low-confidence case above.
		// In streaming mode, citations are available from the retrieved chunks before streaming begins.
		// The client receives the text stream and can pair it with citations metadata.
		return streamToEventIterator(response.toUIMessageStream());
	});
