import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/client";
import { addFileToIndex, getPersonalSearchIndexById } from "@repo/database";
import { processFile, type ProcessFileResult } from "@repo/document-processor";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireOrganizationAccess } from "../lib/access";
import {
	ensurePersonalSearchCollection,
	indexPersonalDocumentChunks,
} from "../lib/personal-collections";

/**
 * Upload a file to a personal search index.
 * Accepts base64-encoded file content.
 */
export const uploadFile = protectedProcedure
	.use(creditGate("chat", CREDIT_RATES.chat))
	.route({
		method: "POST",
		path: "/my-search/indexes/{indexId}/files",
		tags: ["My Search"],
		summary: "Upload file to personal search index",
		description:
			"Uploads a file (PDF, DOCX, CSV, JSON, MD, TXT, EPUB) to a personal search index. The file is parsed and chunked for search.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			indexId: z.string(),
			filename: z.string().min(1),
			content: z.string(), // base64-encoded file content
			mimeType: z.string().optional(),
		}),
	)
	.output(
		z.object({
			fileId: z.string(),
			filename: z.string(),
			chunkCount: z.number(),
		}),
	)
	.handler(async ({ input, context: { ...rest } }) => {
		const user = (rest as Record<string, unknown>).user as { id: string };
		const { creditReservationId } = rest as unknown as CreditGateContext;

		try {
			await requireOrganizationAccess(input.organizationId, user.id);

			// Verify index access
			const index = await getPersonalSearchIndexById(input.organizationId, input.indexId);
			if (!index) {
				throw new ORPCError("NOT_FOUND", { message: "Search index not found" });
			}

			// Decode base64 to buffer
			const buffer = Buffer.from(input.content, "base64");

			// Process the file through document-processor
			const result: ProcessFileResult = await processFile({
				filename: input.filename,
				content: buffer,
				mimeType: input.mimeType,
			});

			// Store file metadata in index schema
			const fileId = randomUUID();
			await addFileToIndex(input.indexId, {
				id: fileId,
				filename: input.filename,
				originalFilename: input.filename,
				mimeType: result.document.mimeType,
				fileType: result.fileType ?? "txt",
				fileSize: buffer.length,
				wordCount: result.document.content.split(/\s+/).filter(Boolean).length,
				uploadedAt: new Date().toISOString(),
			});

			// Index chunks into Typesense
			try {
				await ensurePersonalSearchCollection(
					input.organizationId,
					index.slug,
					index.version,
				);
				await indexPersonalDocumentChunks(input.organizationId, index.slug, index.version, {
					fileId,
					filename: input.filename,
					fileType: result.fileType ?? "txt",
					chunks: result.chunks,
				});
			} catch (error) {
				logger.error("Failed to index personal document chunks into Typesense", {
					fileId,
					filename: input.filename,
					error,
				});
				// Don't fail the upload — metadata is stored
			}

			// Commit flat-fee usage on successful file upload
			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "chat",
				provider: "aacsearch",
				model: "file-ingest",
				flatFeeKopecks: CREDIT_RATES.chat,
			});

			logger.info(
				`File uploaded to personal index: ${input.filename} (${result.chunks.length} chunks)`,
			);

			return {
				fileId,
				filename: input.filename,
				chunkCount: result.chunks.length,
			};
		} catch (err) {
			// Release reservation on any error
			await releaseCreditReservation(creditReservationId);
			throw err;
		}
	});
