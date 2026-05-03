/**
 * Public assistant endpoint for anonymous widget users.
 *
 * Auth: Bearer ss_search_* API key (same as public search)
 * Rate limiting: uses existing SearchRateLimitBucket
 * Session: sessionId UUID from widget (no Better Auth session required)
 */

import { randomUUID } from "node:crypto";

import {
	appendMessage,
	createConversation,
	getConversation,
	getConversationHistory,
	updateConversationMetadata,
} from "@repo/database";
import { logger } from "@repo/logs";
import { streamText, textModel } from "@repo/ai";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { gatePublicSearchRequest } from "../search/lib/public-auth";
import { quotaCheck } from "../entitlements/middleware/quota-check";

import { classifyIntent } from "./lib/intent-classifier";
import { buildSystemPrompt } from "./lib/prompts/prompt-builder";
import { checkUserMessage, sanitizeOutput } from "./lib/safety-guard";
import { getConnectors } from "./connectors/registry";

import { createSearchProductsTool } from "./lib/tools/search-products";
import { createCheckAvailabilityTool } from "./lib/tools/check-availability";
import { createGetProductDetailsTool } from "./lib/tools/get-product-details";
import { createSearchKnowledgeTool } from "./lib/tools/search-knowledge";
import { createGetSimilarProductsTool } from "./lib/tools/get-similar-products";
import { createEscalateToOperatorTool } from "./lib/tools/escalate-to-operator";
import { createEscalationService } from "./lib/escalation/escalation-service";

export const assistantPublicApp = new Hono()
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["POST", "OPTIONS"],
			maxAge: 86400,
		}),
	)
	// Create conversation session
	.post("/assistant/conversation", async (c) => {
		const authResult = await gatePublicSearchRequest(c);
		if (authResult instanceof Response) {
			return authResult;
		}

		const organizationId = authResult.verified.organizationId;
		const body = await c.req.json().catch(() => ({}));
		const sessionId = body.sessionId ?? randomUUID();
		const entryPoint = body.entryPoint ?? null;
		const locale = body.locale ?? "ru";

		const conversation = await createConversation({
			organizationId,
			userId: null,
			sessionId,
			mode: "product_consultation",
			entryPoint,
			metadata: { locale, sessionId },
		});

		return c.json({ conversationId: conversation.id, sessionId });
	})
	// Stream chat message (SSE)
	.post("/assistant/chat", async (c) => {
		const authResult = await gatePublicSearchRequest(c);
		if (authResult instanceof Response) {
			return authResult;
		}

		const organizationId = authResult.verified.organizationId;

		const quotaAllowed = await quotaCheck(c, organizationId, "search").catch(() => true);
		if (!quotaAllowed) {
			return c.json({ error: "quota_exceeded" }, 402);
		}

		const body = await c.req.json().catch(() => null);
		if (!body || typeof body.message !== "string" || !body.message.trim()) {
			return c.json({ error: "message required" }, 400);
		}

		const { message, conversationId: reqConvId, sessionId, indexSlug = "products", locale = "ru" } = body;

		// Content filter
		const safety = checkUserMessage(message);
		if (!safety.safe) {
			return c.json({ error: "message_filtered", reason: safety.reason }, 400);
		}

		// Resolve or create conversation
		let conversationId: string = reqConvId;
		let conversation = conversationId ? await getConversation(conversationId, 0) : null;

		if (!conversation || conversation.organizationId !== organizationId) {
			const newConv = await createConversation({
				organizationId,
				userId: null,
				sessionId: sessionId ?? randomUUID(),
				mode: "product_consultation",
				entryPoint: body.entryPoint ?? null,
				metadata: { locale },
			});
			conversationId = newConv.id;
			conversation = await getConversation(conversationId, 0);
		}

		const historyMessages = await getConversationHistory(conversationId, 10);
		const metadata = (conversation?.metadata ?? {}) as Record<string, unknown>;
		const cachedMode = metadata.lastMode as import("./lib/intent-classifier").AssistantMode | undefined;

		const classification = await classifyIntent(message, { cachedMode });
		const mode = classification.mode;
		if (mode !== cachedMode) {
			updateConversationMetadata(conversationId, { lastMode: mode }).catch(() => {});
		}

		const systemPrompt = buildSystemPrompt({
			mode,
			brandName: "AACsearch",
			locale,
			availableTools: ["search_products", "check_availability", "get_product_details", "search_knowledge", "get_similar_products", "escalate_to_operator"],
		});

		const connectors = getConnectors(organizationId);
		const escalationService = createEscalationService({});

		const tools = {
			search_products: createSearchProductsTool({ indexSlug }),
			check_availability: createCheckAvailabilityTool(connectors.inventory),
			get_product_details: createGetProductDetailsTool({ indexSlug }),
			search_knowledge: createSearchKnowledgeTool(""),
			get_similar_products: createGetSimilarProductsTool({ organizationId }),
			escalate_to_operator: createEscalateToOperatorTool({
				conversationId,
				organizationId,
				escalationService,
			}),
		};

		const llmMessages = [
			...historyMessages
				.filter((m) => m.role === "user" || m.role === "assistant")
				.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
			{ role: "user" as const, content: message },
		];

		await appendMessage({ conversationId, role: "user", content: message });
		const turnStart = Date.now();

		// oxlint-disable-next-line typescript/await-thenable
		const response = streamText({
			model: textModel,
			system: systemPrompt,
			messages: llmMessages,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			tools: tools as any,
		});

		// Persist assistant response after stream
		Promise.resolve(response.text).then(async (text) => {
			try {
				const safeText = sanitizeOutput(text);
				const usage = await response.usage;
				await appendMessage({
					conversationId,
					role: "assistant",
					content: safeText,
					latencyMs: Date.now() - turnStart,
					inputTokens: usage?.inputTokens ?? null,
					outputTokens: usage?.outputTokens ?? null,
				});
			} catch (err) {
				logger.warn({ conversationId, error: err }, "assistantPublic: failed to save assistant message");
			}
		}).catch(() => {});

		// Return SSE stream using UI message stream format
		return new Response(response.toUIMessageStream(), {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
			},
		});
	});
