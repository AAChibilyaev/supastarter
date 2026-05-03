import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/client";
import { addFileToIndex, getPersonalSearchIndexById } from "@repo/database";
import { processUrl } from "@repo/document-processor";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";
import {
	ensurePersonalSearchCollection,
	indexPersonalDocumentChunks,
} from "../lib/personal-collections";

export const addUrl = protectedProcedure
	.route({
		method: "POST",
		path: "/my-search/indexes/{indexId}/urls",
		tags: ["My Search"],
		summary: "Add URL to personal search index",
		description:
			"Fetches a URL, parses its content, and adds it as a document in the personal search index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			indexId: z.string(),
			url: z.string().url(),
		}),
	)
	.output(
		z.object({
			fileId: z.string(),
			url: z.string(),
			title: z.string(),
			chunkCount: z.number(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAccess(input.organizationId, user.id);

		// Verify index access
		const index = await getPersonalSearchIndexById(input.organizationId, input.indexId);
		if (!index) {
			throw new ORPCError("NOT_FOUND", { message: "Search index not found" });
		}

		// Fetch and parse the URL
		const result = await processUrl({ url: input.url });

		// Store as a file entry in the index schema
		const fileId = randomUUID();
		await addFileToIndex(input.indexId, {
			id: fileId,
			filename: `url-${fileId.slice(0, 8)}.html`,
			originalFilename: input.url,
			mimeType: result.document.mimeType,
			fileType: "url",
			fileSize: result.document.content.length,
			wordCount: result.document.content.split(/\s+/).filter(Boolean).length,
			uploadedAt: new Date().toISOString(),
			sourceUrl: input.url,
		});

		// Index chunks into Typesense
		try {
			await ensurePersonalSearchCollection(input.organizationId, index.slug, index.version);
			await indexPersonalDocumentChunks(input.organizationId, index.slug, index.version, {
				fileId,
				filename: `url-${fileId.slice(0, 8)}.html`,
				fileType: "url",
				sourceUrl: input.url,
				chunks: result.chunks,
			});
		} catch (error) {
			logger.error("Failed to index URL chunks into Typesense", {
				fileId,
				url: input.url,
				error,
			});
			// Don't fail the upload — metadata is stored
		}

		logger.info(`URL added to personal index: ${input.url} (${result.chunks.length} chunks)`);

		return {
			fileId,
			url: input.url,
			title: result.document.title,
			chunkCount: result.chunks.length,
		};
	});
