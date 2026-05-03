import { z } from "zod";

export const hnswParamsSchema = z.object({
	ef_construction: z.number().int().positive().optional(),
	M: z.number().int().positive().optional(),
});

export type HnswParamsInput = z.infer<typeof hnswParamsSchema>;

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
	]),
	facet: z.boolean().optional(),
	optional: z.boolean().optional(),
	index: z.boolean().optional(),
	sort: z.boolean().optional(),
	/** Number of dimensions for vector fields (required when type is "float[]" used as a vector field). */
	num_dim: z.number().int().positive().optional(),
	/** HNSW index build parameters for vector fields. ef_construction controls index quality; M controls connections per node. */
	hnsw_params: hnswParamsSchema.optional(),
});

export type SearchFieldInput = z.infer<typeof searchFieldSchema>;

export const searchIndexSlugSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase letters, digits, and dashes");

export const searchApiKeyScopeSchema = z.enum(["search", "ingest", "admin", "connector_write"]);
