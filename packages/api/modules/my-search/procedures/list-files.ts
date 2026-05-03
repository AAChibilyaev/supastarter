import { listFilesInIndex } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const listFiles = protectedProcedure
	.route({
		method: "GET",
		path: "/my-search/indexes/{indexId}/files",
		tags: ["My Search"],
		summary: "List files in personal search index",
		description: "Lists all files (uploaded documents and URLs) in a personal search index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			indexId: z.string(),
		}),
	)
	.output(
		z.array(
			z.object({
				id: z.string(),
				filename: z.string(),
				originalFilename: z.string(),
				mimeType: z.string(),
				fileType: z.string(),
				fileSize: z.number(),
				wordCount: z.number(),
				uploadedAt: z.string(),
				sourceUrl: z.string().optional(),
			}),
		),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAccess(input.organizationId, user.id);

		const files = await listFilesInIndex(input.indexId, input.organizationId);
		return files.map((f) => ({
			id: f.id,
			filename: f.filename,
			originalFilename: f.originalFilename,
			mimeType: f.mimeType,
			fileType: f.fileType,
			fileSize: f.fileSize,
			wordCount: f.wordCount,
			uploadedAt: f.uploadedAt,
			sourceUrl: f.sourceUrl,
		}));
	});
