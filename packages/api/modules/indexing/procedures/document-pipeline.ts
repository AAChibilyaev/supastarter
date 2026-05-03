import { DocumentPipeline, detectFileType } from "@repo/document-processor";
import { bulkUpsert, generateEmbeddings } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

/**
 * Process and index a document file.
 *
 * POST /indexing/documents/process-file
 */
export const processDocumentFile = protectedProcedure
	.route({
		method: "POST",
		path: "/indexing/documents/process-file",
		tags: ["Document Pipeline"],
		summary: "Process and index a document file",
		description:
			"Accepts a base64-encoded file, runs it through the 5-stage pipeline (parse → chunk → embed → index), and returns indexing results.",
	})
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
			collection: z.string().default("documents").describe("Typesense collection name"),
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
	.handler(async ({ input, context: { user } }) => {
		const { filename, content, mimeType, chunkStrategy, embeddingModel, collection } = input;

		// Get org ID from user context
		const organizationId = (user as Record<string, unknown>).organizationId as string;
		if (!organizationId) {
			throw new Error("Organization ID required");
		}

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
				id: `${organizationId}:doc:${Buffer.from(d.text).toString("base64url").slice(0, 32)}:${i}`,
				text: d.text,
				embedding: d.embedding,
				tenant_id: organizationId,
				...d.metadata,
			}));

			const result = await bulkUpsert({
				collection,
				tenantId: organizationId,
				documents: docs as Record<string, unknown>[],
				action: "upsert",
			});

			return documents.map((_, i) => ({
				chunkIndex: i,
				indexedId: docs[i]?.id ?? "",
				success: !result.failures.some((f) => f.index === i),
			}));
		};

		const pipelineResult = await pipeline.processFile(
			filename,
			buffer,
			mimeType,
			{ strategy: chunkStrategy },
			embeddingFn,
			indexFn,
		);

		return {
			documentId: pipelineResult.id,
			title: pipelineResult.title,
			chunkCount: pipelineResult.chunks.length,
			indexedCount: pipelineResult.indexResults.filter((r) => r.success).length,
			fileType,
			stage: "completed",
		};
	});

/**
 * Process and index documents from a URL (crawl).
 *
 * POST /indexing/documents/process-url
 */
export const processDocumentUrl = protectedProcedure
	.route({
		method: "POST",
		path: "/indexing/documents/process-url",
		tags: ["Document Pipeline"],
		summary: "Crawl a URL and index discovered content",
		description:
			"Crawls a URL (respecting maxDepth/maxPages), parses each page, chunks, embeds, and indexes into Typesense.",
	})
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
			collection: z.string().default("documents").describe("Typesense collection name"),
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
	.handler(async ({ input, context: { user } }) => {
		const { url, maxDepth, maxPages, chunkStrategy, embeddingModel, collection } = input;
		const organizationId = (user as Record<string, unknown>).organizationId as string;

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
				id: `${organizationId}:url:${Buffer.from(d.text).toString("base64url").slice(0, 32)}:${i}`,
				text: d.text,
				embedding: d.embedding,
				tenant_id: organizationId,
				...d.metadata,
			}));

			const result = await bulkUpsert({
				collection,
				tenantId: organizationId,
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
 * Get dead-letter queue status.
 *
 * GET /indexing/documents/dlq
 */
export const getDeadLetterQueueStatus = protectedProcedure
	.route({
		method: "GET",
		path: "/indexing/documents/dlq",
		tags: ["Document Pipeline"],
		summary: "Get dead-letter queue status",
		description: "Returns count of failed documents in the dead-letter queue.",
	})
	.input(z.object({}))
	.output(
		z.object({
			total: z.number(),
			pendingRetry: z.number(),
			exhausted: z.number(),
		}),
	)
	.handler(async () => {
		const pipeline = new DocumentPipeline();
		const dlq = pipeline.getDeadLetterQueue();
		return dlq.count();
	});

/**
 * Retry failed pipeline documents from the dead-letter queue.
 *
 * POST /indexing/documents/retry-failed
 */
export const retryFailedDocuments = protectedProcedure
	.route({
		method: "POST",
		path: "/indexing/documents/retry-failed",
		tags: ["Document Pipeline"],
		summary: "Retry failed document pipeline jobs",
	})
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
	.handler(async ({ input }) => {
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
