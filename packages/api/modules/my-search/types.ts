import { z } from "zod";

export const mySearchSlugSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase letters, digits, and dashes");

export const personalIndexViewSchema = z.object({
	id: z.string(),
	organizationId: z.string(),
	slug: z.string(),
	displayName: z.string(),
	fileCount: z.number(),
	totalFileSize: z.number(),
	createdAt: z.date(),
});

export const fileEntrySchema = z.object({
	id: z.string(),
	filename: z.string(),
	originalFilename: z.string(),
	mimeType: z.string(),
	fileType: z.string(),
	fileSize: z.number(),
	wordCount: z.number(),
	uploadedAt: z.string(),
	sourceUrl: z.string().optional(),
});

export const indexDetailViewSchema = personalIndexViewSchema.extend({
	files: z.array(fileEntrySchema),
	chunkCount: z.number().optional(),
});
