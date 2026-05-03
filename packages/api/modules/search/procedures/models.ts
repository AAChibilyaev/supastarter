import { db, type Prisma } from "@repo/database";
import { EMBEDDING_MODELS } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationAdmin } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const modelConfigSchema = z.object({
	embeddingModel: z.string().default("text-embedding-3-small"),
	hybridAlpha: z.number().min(0).max(1).default(0.5),
	enabled: z.boolean().default(false),
	azureApiUrl: z.string().optional(),
	azureApiVersion: z.string().optional(),
	openaiCompatibleApiUrl: z.string().optional(),
	openaiCompatibleApiKey: z.string().optional(),
});

type ModelConfig = z.infer<typeof modelConfigSchema>;

export const getModelConfig = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/models",
		tags: ["Search"],
		summary: "Get embedding model configuration for an index",
		description: "Returns the embedding model settings stored in the index schema metadata.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(modelConfigSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const schema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};
		const modelConfig = (schema as Record<string, unknown>)._modelConfig as
			| ModelConfig
			| undefined;

		return {
			embeddingModel: modelConfig?.embeddingModel ?? "text-embedding-3-small",
			hybridAlpha: modelConfig?.hybridAlpha ?? 0.5,
			enabled: modelConfig?.enabled ?? false,
			azureApiUrl: modelConfig?.azureApiUrl,
			azureApiVersion: modelConfig?.azureApiVersion,
			openaiCompatibleApiUrl: modelConfig?.openaiCompatibleApiUrl,
			openaiCompatibleApiKey: modelConfig?.openaiCompatibleApiKey,
		};
	});

export const updateModelConfig = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/models",
		tags: ["Search"],
		summary: "Update embedding model configuration for an index",
		description: "Updates the embedding model settings stored in the index schema metadata.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			embeddingModel: z.string().optional(),
			hybridAlpha: z.number().min(0).max(1).optional(),
			enabled: z.boolean().optional(),
			azureApiUrl: z.string().optional(),
			azureApiVersion: z.string().optional(),
			openaiCompatibleApiUrl: z.string().optional(),
			openaiCompatibleApiKey: z.string().optional(),
		}),
	)
	.output(modelConfigSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const schema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};

		const existing =
			((schema as Record<string, unknown>)._modelConfig as
				| Record<string, unknown>
				| undefined) ?? {};

		const updated: ModelConfig = {
			embeddingModel:
				(input.embeddingModel as string) ??
				(existing.embeddingModel as string) ??
				"text-embedding-3-small",
			hybridAlpha: (input.hybridAlpha as number) ?? (existing.hybridAlpha as number) ?? 0.5,
			enabled: (input.enabled as boolean) ?? (existing.enabled as boolean) ?? false,
			azureApiUrl:
				(input.azureApiUrl as string | undefined) ??
				(existing.azureApiUrl as string | undefined),
			azureApiVersion:
				(input.azureApiVersion as string | undefined) ??
				(existing.azureApiVersion as string | undefined),
			openaiCompatibleApiUrl:
				(input.openaiCompatibleApiUrl as string | undefined) ??
				(existing.openaiCompatibleApiUrl as string | undefined),
			openaiCompatibleApiKey:
				(input.openaiCompatibleApiKey as string | undefined) ??
				(existing.openaiCompatibleApiKey as string | undefined),
		};

		(schema as Record<string, unknown>)._modelConfig = updated;

		await db.searchIndex.update({
			where: { id: index.id },
			data: { schema: schema as Prisma.InputJsonValue },
		});

		return updated;
	});

export const listModels = protectedProcedure
	.route({
		method: "GET",
		path: "/search/models",
		tags: ["Search"],
		summary: "List available embedding models",
		description:
			"Returns the list of supported embedding models with their dimensions and provider info.",
	})
	.output(
		z.array(
			z.object({
				name: z.string(),
				dimensions: z.number(),
				provider: z.string(),
				maxInputTokens: z.number(),
			}),
		),
	)
	.handler(async () => {
		return Object.values(EMBEDDING_MODELS).map((model) => ({
			name: model.name,
			dimensions: model.dimensions,
			provider: model.provider,
			maxInputTokens: model.maxInputTokens,
		}));
	});
