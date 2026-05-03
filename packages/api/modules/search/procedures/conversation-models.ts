import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

/**
 * Schema for creating/updating a Typesense conversation model.
 * Maps to Typesense's ConversationModelCreateSchema.
 */
const conversationModelCreateSchema = z.object({
	modelName: z.string().min(1).max(256).describe("The LLM model name (e.g. gpt-4o-mini)"),
	apiKey: z.string().optional().describe("OpenAI API key (uses default if omitted)"),
	systemPrompt: z
		.string()
		.max(10000)
		.optional()
		.describe("Optional system prompt for the conversational assistant"),
	maxBytes: z.number().int().positive().default(16384).describe("Max context window in bytes"),
	historyCollection: z
		.string()
		.optional()
		.describe("Optional collection name for storing conversation history"),
	ttl: z
		.number()
		.int()
		.positive()
		.default(86400)
		.describe("Conversation TTL in seconds (default: 24h)"),
	openaiUrl: z.string().url().optional().describe("Custom OpenAI-compatible API URL"),
});

const conversationModelResponseSchema = z.object({
	id: z.string(),
	modelName: z.string(),
	maxBytes: z.number(),
	ttl: z.number(),
	systemPrompt: z.string().nullable(),
});

export const createConversationModel = protectedProcedure
	.route({
		method: "POST",
		path: "/search/conversation-models",
		tags: ["Search"],
		summary: "Register a Typesense conversation model",
		description:
			"Creates a conversation model in Typesense for native RAG conversational search. " +
			"The model defines which LLM to use (e.g. gpt-4o-mini) and how to manage conversation context.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			...conversationModelCreateSchema.shape,
		}),
	)
	.output(conversationModelResponseSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await (client as any)
			.conversations()
			.models()
			.create({
				model_name: input.modelName,
				...(input.apiKey ? { api_key: input.apiKey } : {}),
				...(input.systemPrompt ? { system_prompt: input.systemPrompt } : {}),
				max_bytes: input.maxBytes,
				...(input.historyCollection ? { history_collection: input.historyCollection } : {}),
				ttl: input.ttl,
				...(input.openaiUrl ? { openai_url: input.openaiUrl } : {}),
			} as Record<string, unknown>);

		const modelResult = result as Record<string, unknown>;

		return {
			id: (modelResult.id ?? "") as string,
			modelName: (input.modelName ?? "") as string,
			maxBytes: input.maxBytes,
			ttl: input.ttl,
			systemPrompt: input.systemPrompt ?? null,
		};
	});

export const listConversationModels = protectedProcedure
	.route({
		method: "GET",
		path: "/search/conversation-models",
		tags: ["Search"],
		summary: "List all conversation models",
		description: "Returns all registered conversation models from Typesense.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.array(
			z.object({
				id: z.string(),
				modelName: z.string(),
				maxBytes: z.number(),
				ttl: z.number(),
				systemPrompt: z.string().nullable(),
			}),
		),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await (client as any).conversations().models().retrieve();

		const models = (result ?? []) as Array<Record<string, unknown>>;

		return models.map((m) => ({
			id: (m.id ?? "") as string,
			modelName: (m.model_name ?? "") as string,
			maxBytes: (m.max_bytes ?? 0) as number,
			ttl: (m.ttl ?? 86400) as number,
			systemPrompt: (m.system_prompt ?? null) as string | null,
		}));
	});

export const getConversationModel = protectedProcedure
	.route({
		method: "GET",
		path: "/search/conversation-models/{id}",
		tags: ["Search"],
		summary: "Get a conversation model",
		description: "Returns details of a specific conversation model.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
		}),
	)
	.output(conversationModelResponseSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await (client as any).conversations().models(input.id).retrieve();

		const model = result as Record<string, unknown>;

		return {
			id: (model.id ?? input.id) as string,
			modelName: (model.model_name ?? "") as string,
			maxBytes: (model.max_bytes ?? 16384) as number,
			ttl: (model.ttl ?? 86400) as number,
			systemPrompt: (model.system_prompt ?? null) as string | null,
		};
	});

export const updateConversationModel = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/conversation-models/{id}",
		tags: ["Search"],
		summary: "Update a conversation model",
		description: "Updates configuration for an existing Typesense conversation model.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
			modelName: z.string().optional(),
			apiKey: z.string().optional(),
			systemPrompt: z.string().optional(),
			maxBytes: z.number().int().positive().optional(),
			historyCollection: z.string().optional(),
			ttl: z.number().int().positive().optional(),
			openaiUrl: z.string().url().optional(),
		}),
	)
	.output(conversationModelResponseSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();

		const updatePayload: Record<string, unknown> = {};
		if (input.modelName !== undefined) updatePayload.model_name = input.modelName;
		if (input.apiKey !== undefined) updatePayload.api_key = input.apiKey;
		if (input.systemPrompt !== undefined) updatePayload.system_prompt = input.systemPrompt;
		if (input.maxBytes !== undefined) updatePayload.max_bytes = input.maxBytes;
		if (input.historyCollection !== undefined)
			updatePayload.history_collection = input.historyCollection;
		if (input.ttl !== undefined) updatePayload.ttl = input.ttl;
		if (input.openaiUrl !== undefined) updatePayload.openai_url = input.openaiUrl;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await (client as any).conversations().models(input.id).update(updatePayload);

		const model = result as Record<string, unknown>;

		return {
			id: input.id,
			modelName: (model.model_name ?? input.modelName ?? "") as string,
			maxBytes: (model.max_bytes ?? input.maxBytes ?? 16384) as number,
			ttl: (model.ttl ?? input.ttl ?? 86400) as number,
			systemPrompt: (model.system_prompt ?? input.systemPrompt ?? null) as string | null,
		};
	});

export const deleteConversationModel = protectedProcedure
	.route({
		method: "DELETE",
		path: "/search/conversation-models/{id}",
		tags: ["Search"],
		summary: "Delete a conversation model",
		description: "Removes a conversation model from Typesense.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
		}),
	)
	.output(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (client as any).conversations().models(input.id).delete();

		return { id: input.id };
	});
