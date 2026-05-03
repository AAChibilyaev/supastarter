import "server-only";
import { z } from "zod";

import { DocumentPipeline, detectFileType } from "@repo/document-processor";

import { authedProcedure } from "../../../lib/authed-procedure";
import { generateEmbeddings, bulkUpsert } from "@repo/search";

/**
 * Process and index a document file.
 *
 * POST /indexing/documents/process-file
 * Body: { filename, content (base64), mimeType?, chunkStrategy?, embeddingModel?, collection? }
 */
export const processDocumentFile = authedProcedure
	.metadata({ resource: "documents", action: "create" })
	.input(
		z.object({
			filename: z.string().min(1).describe("Source filename with extension"),
			content: z.string().min(1).describe("Base64-encoded file content"),
			mimeType: z.string().optional().describe("MIME type override"),
			chunkStrategy: z
				.enum(["fixed", "semantic", "markdown", "code"])
				.default("fixed")
				.describe("Chunking strategy"),
			embeddingModel: z
				.string()
				.default("text-embedding-3-small")
				.describe("Embedding model name"),
			collection: z
				.string()
				.default("documents")
				.describe("Typesense collection name"),
		}),
	)
	.output(
		z.object({
			documentId: z.string(),
			title: z.string(),
			chunkCount: z.number(),
			indexedCount: z.number(),
			fileType: z.string().nullable(),
			stage: z.string(),
		}),
	)
	.mutation(async ({ ctx, input }) => {
		const { filename, content, mimeType, chunkStrategy, embeddingModel, collection } = input;
		const tenantId = ctx.organizationId;

		// Decode base64 content
		const buffer = Buffer.from(content, "base64");

		const fileType = detectFileType(filename, mimeType);
		if (!fileType) {
			throw new Error(`Unsupported file type: ${filename}`);
		}

		const pipeline = new DocumentPipeline();

		const embeddingFn = async (chunks: string[]) => {
			const results = await generateEmbeddings(chunks, embeddingModel);
			return results.map((r) => r.vector);
		};

		const indexFn = async (
			documents: Array<{
				text: string;
				embedding?: number[];
				metadata: Record<string, unknown>;
			}>,
		) => {
			const docs = documents.map((d, i) => ({
				id: `${tenantId}:doc:${Buffer.from(d.text).toString("base64url").slice(0, 32)}:${i}`,
				text: d.text,
				embedding: d.embedding,
				tenant_id: tenantId,
				...d.metadata,
			}));

			const result = await bulkUpsert({
				collection,
				tenantId,
				documents: docs as Record<string, unknown>[],
				action: "upsert",
			});

			return documents.map((_, i) => ({
				chunkIndex: i,
				indexedId: docs[i]?.id ?? "",
				success: !result.failures.some((f) => f.index === i),
			}));
		};

		const result = await pipeline.processFile(
			filename,
			buffer,
			mimeType,
			{ strategy: chunkStrategy },
			embeddingFn,
			indexFn,
		);

		return {
			documentId: result.id,
			title: result.title,
			chunkCount: result.chunks.length,
			indexedCount: result.indexResults.filter((r) => r.success).length,
			fileType,
			stage: "completed",
		};
	});

/**
 * Process and index documents from a URL (crawl).
 *
 * POST /indexing/documents/process-url
 * Body: { url, maxDepth?, maxPages?, chunkStrategy?, embeddingModel?, collection? }
 */
export const processDocumentUrl = authedProcedure
	.metadata({ resource: "documents", action: "create" })
	.input(
		z.object({
			url: z.string().url().describe("Starting URL to crawl"),
			maxDepth: z.number().int().min(1).max(10).default(1).describe("Max crawl depth"),
			maxPages: z.number().int().min(1).max(500).default(25).describe("Max pages to crawl"),
			chunkStrategy: z
				.enum(["fixed", "semantic", "markdown", "code"])
				.default("fixed")
				.describe("Chunking strategy"),
			embeddingModel: z
				.string()
				.default("text-embedding-3-small")
				.describe("Embedding model name"),
			collection: z
				.string()
				.default("documents")
				.describe("Typesense collection name"),
		}),
	)
	.output(
		z.object({
			totalPages: z.number(),
			totalChunks: z.number(),
			totalIndexed: z.number(),
			results: z.array(
				z.object({
					url: z.string(),
					chunkCount: z.number(),
					indexedCount: z.number(),
					status: z.string(),
				}),
			),
		}),
	)
	.mutation(async ({ ctx, input }) => {
		const { url, maxDepth, maxPages, chunkStrategy, embeddingModel, collection } = input;
		const tenantId = ctx.organizationId;

		const pipeline = new DocumentPipeline();

		const embeddingFn = async (chunks: string[]) => {
			const results = await generateEmbeddings(chunks, embeddingModel);
			return results.map((r) => r.vector);
		};

		const indexFn = async (
			documents: Array<{
				text: string;
				embedding?: number[];
				metadata: Record<string, unknown>;
			}>,
		) => {
			const docs = documents.map((d, i) => ({
				id: `${tenantId}:url:${Buffer.from(d.text).toString("base64url").slice(0, 32)}:${i}`,
				text: d.text,
				embedding: d.embedding,
				tenant_id: tenantId,
				...d.metadata,
			}));

			const result = await bulkUpsert({
				collection,
				tenantId,
				documents: docs as Record<string, unknown>[],
				action: "upsert",
			});

			return documents.map((_, i) => ({
				chunkIndex: i,
				indexedId: docs[i]?.id ?? "",
				success: !result.failures.some((f) => f.index === i),
			}));
		};

		const results = await pipeline.processUrl(
			url,
			{ maxDepth, maxPages, sameDomain: true },
			{ strategy: chunkStrategy },
			embeddingFn,
			indexFn,
		);

		return {
			totalPages: results.length,
			totalChunks: results.reduce((sum, r) => sum + r.chunks.length, 0),
			totalIndexed: results.reduce(
				(sum, r) => sum + r.indexResults.filter((ix) => ix.success).length,
				0,
			),
			results: results.map((r) => ({
				url: r.sourceUri,
				chunkCount: r.chunks.length,
				indexedCount: r.indexResults.filter((ix) => ix.success).length,
				status: "completed",
			})),
		};
	});

/**
 * Get pipeline progress for a document.
 *
 * GET /indexing/documents/progress/:documentId
 */
export const getDocumentProgress = authedProcedure
	.metadata({ resource: "documents", action: "read" })
	.input(
		z.object({
			documentId: z.string().describe("Document ID from process-file response"),
		}),
	)
	.output(
		z
			.object({
				documentId: z.string(),
				sourceUri: z.string(),
				stage: z.string(),
				status: z.string(),
				progress: z.number(),
				message: z.string(),
				error: z.string().optional(),
			})
			.nullable(),
	)
	.query(async ({ input }) => {
		const pipeline = new DocumentPipeline();
		const tracker = pipeline.getProgressTracker();
		const progress = tracker.get(input.documentId);

		if (!progress) return null;

		return {
			documentId: progress.documentId,
			sourceUri: progress.sourceUri,
			stage: progress.stage,
			status: progress.status,
			progress: progress.progress,
			message: progress.message,
			error: progress.error,
		};
	});

/**
 * Get dead-letter queue status.
 *
 * GET /indexing/documents/dlq
 */
export const getDeadLetterQueueStatus = authedProcedure
	.metadata({ resource: "documents", action: "read" })
	.input(z.object({}))
	.output(
		z.object({
			total: z.number(),
			pendingRetry: z.number(),
			exhausted: z.number(),
		}),
	)
	.query(async () => {
		const pipeline = new DocumentPipeline();
		const dlq = pipeline.getDeadLetterQueue();
		return dlq.count();
	});

/**
 * Retry failed pipeline documents from the dead-letter queue.
 *
 * POST /indexing/documents/retry-failed
 */
export const retryFailedDocuments = authedProcedure
	.metadata({ resource: "documents", action: "update" })
	.input(
		z.object({
			embeddingModel: z.string().default("text-embedding-3-small"),
			collection: z.string().default("documents"),
		}),
	)
	.output(
		z.object({
			retriedCount: z.number(),
		}),
	)
	.mutation(async ({ input }) => {
		const pipeline = new DocumentPipeline();

		const embeddingFn = async (chunks: string[]) => {
			const results = await generateEmbeddings(chunks, input.embeddingModel);
			return results.map((r) => r.vector);
		};

		const indexFn = async (
			documents: Array<{
				text: string;
				embedding?: number[];
				metadata: Record<string, unknown>;
			}>,
		) => {
			const docs = documents.map((d, i) => ({
				id: `${Buffer.from(d.text).toString("base64url").slice(0, 32)}:${i}`,
				text: d.text,
				embedding: d.embedding,
				...d.metadata,
			}));

			const result = await bulkUpsert({
				collection: input.collection,
				tenantId: "global",
				documents: docs as Record<string, unknown>[],
				action: "upsert",
			});

			return documents.map((_, i) => ({
				chunkIndex: i,
				indexedId: docs[i]?.id ?? "",
				success: !result.failures.some((f) => f.index === i),
			}));
		};

		const retried = await pipeline.retryFailed(embeddingFn, indexFn);

		return { retriedCount: retried };
	});
