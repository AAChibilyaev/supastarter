import { z } from "zod";

const embedConfigSchema = z.object({
	from: z.array(z.string().min(1)).min(1).describe("Source fields to generate embeddings from"),
	model_config: z.object({
		model_name: z
			.string()
			.min(1)
			.default("openai/text-embedding-3-small")
			.describe("Embedding model name"),
		api_key: z.string().optional().describe("API key for the embedding service"),
		api_url: z.string().optional().describe("Custom API URL for the embedding service"),
	}),
});

export const searchFieldSchema = z.object({
	name: z.string().min(1).max(64),
	type: z.enum([
		"string",
		"int32",
		"int64",
		"float",
		"bool",
		"string[]",
		"int32[]",
		"int64[]",
		"float[]",
		"bool[]",
		"object",
		"object[]",
		"auto",
		"geopoint",
		"geopoint[]",
		"geojson",
	]),
	facet: z.boolean().optional(),
	optional: z.boolean().optional(),
	index: z.boolean().optional(),
	sort: z.boolean().optional(),
	embed: embedConfigSchema.optional(),
});

export type EmbedConfig = z.infer<typeof embedConfigSchema>;

export type SearchFieldInput = z.infer<typeof searchFieldSchema>;

export const searchIndexSlugSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase letters, digits, and dashes");

export const searchApiKeyScopeSchema = z.enum(["search", "ingest", "admin", "connector_write"]);
