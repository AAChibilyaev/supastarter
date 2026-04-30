import { z } from "zod";

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
});

export type SearchFieldInput = z.infer<typeof searchFieldSchema>;

export const searchIndexSlugSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase letters, digits, and dashes");

export const searchApiKeyScopeSchema = z.enum(["search", "ingest", "admin"]);
