import { streamToEventIterator } from "@orpc/client";
import { ORPCError } from "@orpc/server";
// oxlint-disable-next-line typescript/consistent-type-imports
import { streamText, textModel } from "@repo/ai";
import {
	appendMessage,
	createConversation,
	db,
	getConversation,
	getConversationHistory,
	updateConversationMetadata,
} from "@repo/database";
import { logger } from "@repo/logs";
import z from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireOrganizationMember } from "../../search/lib/access";
import { getConnectorsForOrg } from "../connectors/registry";
import { createEscalationService } from "../lib/escalation/escalation-service";
import { classifyIntent } from "../lib/intent-classifier";
import { buildSystemPrompt } from "../lib/prompts/prompt-builder";
import { checkUserMessage, sanitizeOutput } from "../lib/safety-guard";
import { createCheckAvailabilityTool } from "../lib/tools/check-availability";
import { createEscalateToOperatorTool } from "../lib/tools/escalate-to-operator";
import { createGetOrderStatusTool } from "../lib/tools/get-order-status";
import { createGetProductDetailsTool } from "../lib/tools/get-product-details";
import { createGetReturnStatusTool } from "../lib/tools/get-return-status";
import { createGetSimilarProductsTool } from "../lib/tools/get-similar-products";
import { createGetUserConditionsTool } from "../lib/tools/get-user-conditions";
import { createSearchKnowledgeTool } from "../lib/tools/search-knowledge";
import { createSearchProductsTool } from "../lib/tools/search-products";

export const streamAssistant = protectedProcedure
	.use(creditGate("conversation_turn", CREDIT_RATES.conversation_turn))
	.route({
		method: "POST",
		path: "/assistant/stream",
		tags: ["Assistant"],
		summary: "Stream conversational assistant response",
	})
	.input(
		z.object({
			conversationId: z.string().optional(),
			message: z.string().min(1).max(4000),
			organizationId: z.string(),
			indexSlug: z.string().optional().default("products"),
			entryPoint: z
				.enum(["home", "catalog", "search_results", "product_card", "unknown"])
				.optional(),
			productContext: z
				.object({ productId: z.string(), categorySlug: z.string().optional() })
				.optional(),
			locale: z.string().optional().default("ru"),
		}),
	)
	.handler(async ({ input, context }) => {
		const { user } = context;
		const { creditReservationId } = context as unknown as CreditGateContext;

		await requireOrganizationMember(input.organizationId, user.id);

		// --- Safety: content filter ---
		const safety = checkUserMessage(input.message);
		if (!safety.safe) {
			await releaseCreditReservation(creditReservationId, "cancelled");
			throw new ORPCError("BAD_REQUEST", {
				message: safety.reason ?? "Message not allowed.",
			});
		}

		// --- Resolve or create conversation ---
		let conversationId = input.conversationId;
		let conversation = conversationId ? await getConversation(conversationId, 0) : null;

		if (!conversation) {
			const newConv = await createConversation({
				organizationId: input.organizationId,
				userId: user.id,
				sessionId: user.id,
				mode: "product_consultation",
				entryPoint: input.entryPoint ?? null,
				metadata: {
					locale: input.locale,
					...(input.productContext
						? { currentProductId: input.productContext.productId }
						: {}),
				},
			});
			conversationId = newConv.id;
			conversation = await getConversation(conversationId, 0);
		}

		if (!conversation || conversation.organizationId !== input.organizationId) {
			await releaseCreditReservation(creditReservationId);
			throw new ORPCError("FORBIDDEN");
		}

		// --- Load history ---
		const historyMessages = await getConversationHistory(conversationId!, 10);
		const metadata = (conversation.metadata ?? {}) as Record<string, unknown>;
		const personalization = metadata.personalization as Record<string, unknown> | undefined;

		// --- Classify intent ---
		const cachedMode = metadata.lastMode as
			| import("../lib/intent-classifier").AssistantMode
			| undefined;
		const classification = await classifyIntent(input.message, { cachedMode });
		const mode = classification.mode;

		if (mode !== cachedMode) {
			updateConversationMetadata(conversationId!, { lastMode: mode }).catch(() => {});
		}

		// --- Build system prompt ---
		const systemPrompt = buildSystemPrompt({
			mode,
			brandName: "AACsearch",
			locale: input.locale ?? "ru",
			availableTools: [
				"search_products",
				"check_availability",
				"get_order_status",
				"get_return_status",
				"get_user_conditions",
				"get_product_details",
				"search_knowledge",
				"get_similar_products",
				"escalate_to_operator",
			],
			...(input.productContext
				? {
						productContext: {
							productId: input.productContext.productId,
							categorySlug: input.productContext.categorySlug,
						},
					}
				: {}),
			userSegment: (personalization as { segment?: string } | undefined)?.segment,
		});

		// --- Build tools ---
		const connectors = await getConnectorsForOrg(input.organizationId);

		// Read escalation config from org metadata
		const orgForEsc = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});
		const orgMeta = JSON.parse((orgForEsc?.metadata as string | null) ?? "{}") as Record<
			string,
			unknown
		>;
		const ac = (orgMeta.assistantConfig ?? {}) as Record<string, unknown>;
		const escalationService = createEscalationService({
			webhookUrl: (ac.escalationWebhookUrl as string | undefined) || undefined,
			emailTo: (ac.escalationEmailTo as string | undefined) || undefined,
			workingHoursStart:
				typeof ac.workingHoursStart === "number" ? ac.workingHoursStart : undefined,
			workingHoursEnd:
				typeof ac.workingHoursEnd === "number" ? ac.workingHoursEnd : undefined,
		});

		const knowledgeSpace = await db.knowledgeSpace
			.findFirst({
				where: { organizationId: input.organizationId, ownerType: "ORGANIZATION" },
				select: { id: true },
			})
			.catch(() => null);
		const knowledgeSpaceId = knowledgeSpace?.id ?? "";

		const tools = {
			search_products: createSearchProductsTool({ indexSlug: input.indexSlug ?? "products" }),
			check_availability: createCheckAvailabilityTool(connectors.inventory),
			get_order_status: createGetOrderStatusTool(connectors.oms, user.id),
			get_return_status: createGetReturnStatusTool(connectors.oms, user.id),
			get_user_conditions: createGetUserConditionsTool(connectors.loyalty, user.id),
			get_product_details: createGetProductDetailsTool({
				indexSlug: input.indexSlug ?? "products",
			}),
			search_knowledge: createSearchKnowledgeTool(knowledgeSpaceId),
			get_similar_products: createGetSimilarProductsTool({
				organizationId: input.organizationId,
			}),
			escalate_to_operator: createEscalateToOperatorTool({
				conversationId: conversationId!,
				organizationId: input.organizationId,
				escalationService,
			}),
		};

		// --- Build LLM messages ---
		type SimpleMsgRole = "user" | "assistant";
		const llmMessages = [
			...historyMessages
				.filter(
					(m): m is typeof m & { role: SimpleMsgRole } =>
						m.role === "user" || m.role === "assistant",
				)
				.map((m) => ({ role: m.role, content: m.content })),
			{ role: "user" as const, content: input.message },
		];

		// --- Save user message ---
		const turnStart = Date.now();
		await appendMessage({
			conversationId: conversationId!,
			role: "user",
			content: input.message,
		});

		// --- Stream ---
		// oxlint-disable-next-line typescript/await-thenable
		const response = streamText({
			model: textModel,
			system: systemPrompt,
			messages: llmMessages,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			tools: tools as any,
		});

		// Commit usage immediately — stream is long-lived
		await commitFlatFeeUsage({
			reservationId: creditReservationId,
			operation: "conversation_turn",
			provider: "openai",
			model: "gpt-4o-mini",
			flatFeeKopecks: CREDIT_RATES.conversation_turn,
		});

		// Persist assistant response after stream resolves (fire-and-forget)
		Promise.resolve(response.text)
			.then(async (text) => {
				try {
					const safeText = sanitizeOutput(text);
					const usage = await response.usage;
					await appendMessage({
						conversationId: conversationId!,
						role: "assistant",
						content: safeText,
						latencyMs: Date.now() - turnStart,
						inputTokens: usage?.inputTokens ?? null,
						outputTokens: usage?.outputTokens ?? null,
					});
				} catch (saveErr) {
					logger.warn(
						{ conversationId, error: saveErr },
						"streamAssistant: failed to persist assistant message",
					);
				}
			})
			.catch(() => {});

		return streamToEventIterator(response.toUIMessageStream());
	});
