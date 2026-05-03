import { randomUUID } from "node:crypto";

import { logger } from "@repo/logs";

import type { ChunkerOptions } from "./chunker";
import { chunkText as chunkTextFn } from "./chunker";
import { crawlUrl } from "./crawler";
import { DeadLetterQueue } from "./dlq";
import { parseAudio } from "./parsers/audio";
import { parseCsv } from "./parsers/csv";
import { parseDocx } from "./parsers/docx";
import { parseEpub } from "./parsers/epub";
import { parseImage } from "./parsers/image";
import { parseJson } from "./parsers/json";
import { parseMd } from "./parsers/md";
import { parsePdf } from "./parsers/pdf";
import { parsePptx } from "./parsers/pptx";
import { parseTxt } from "./parsers/txt";
import { parseUrl as parseUrlFn } from "./parsers/url";
import { parseVideo } from "./parsers/video";
import { parseXlsx } from "./parsers/xlsx";
import { ProgressTracker } from "./progress";
import type {
	ChunkedPipelineDocument,
	CrawlOptions,
	EmbeddedPipelineDocument,
	IndexOptions,
	IndexedPipelineDocument,
	ParsedPipelineDocument,
	PipelineConfig,
	PipelineDocument,
	PipelineStage,
} from "./types";
import { DEFAULT_PIPELINE_CONFIG, detectFileType } from "./types";

type ParserFn = (
	content: Buffer | string,
	filename: string,
) => Promise<{
	title: string;
	content: string;
	mimeType: string;
	metadata: Record<string, unknown>;
}>;

const parserRegistry: Record<string, ParserFn> = {
	pdf: parsePdf,
	docx: parseDocx,
	xlsx: parseXlsx,
	pptx: parsePptx,
	csv: parseCsv,
	json: parseJson,
	md: parseMd,
	txt: parseTxt,
	epub: parseEpub,
	image: parseImage,
	audio: parseAudio,
	video: parseVideo,
};

/**
 * 5-stage document parsing pipeline orchestrator.
 *
 * Stages:
 *   1. CRAWL   — Discover and fetch documents (URL → multiple pages)
 *   2. PARSE   — Extract text from documents (PDF, DOCX, images, audio, video)
 *   3. CHUNK   — Split text into chunks (fixed, semantic, markdown, code)
 *   4. EMBED   — Generate embeddings for each chunk
 *   5. INDEX   — Index chunks in Typesense (and/or vector store)
 */
export class DocumentPipeline {
	private readonly config: PipelineConfig;
	private readonly progress: ProgressTracker;
	private readonly dlq: DeadLetterQueue;

	constructor(config: Partial<PipelineConfig> = {}) {
		this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
		this.progress = new ProgressTracker();
		this.dlq = new DeadLetterQueue(this.config.dlqPath, this.config.maxRetries);
	}

	/**
	 * Get the progress tracker (for subscribing to updates).
	 */
	getProgressTracker(): ProgressTracker {
		return this.progress;
	}

	/**
	 * Get the dead-letter queue.
	 */
	getDeadLetterQueue(): DeadLetterQueue {
		return this.dlq;
	}

	/**
	 * Run the full pipeline on a file buffer.
	 */
	async processFile(
		filename: string,
		content: Buffer | string,
		mimeType?: string,
		chunkOptions?: Partial<ChunkerOptions>,
		embeddingFn?: (chunks: string[]) => Promise<number[][]>,
		indexFn?: (
			documents: Array<{
				text: string;
				embedding?: number[];
				metadata: Record<string, unknown>;
			}>,
		) => Promise<Array<{ chunkIndex: number; indexedId: string; success: boolean }>>,
	): Promise<IndexedPipelineDocument> {
		const documentId = randomUUID();
		const sourceUri = filename;

		this.progress.start(documentId, sourceUri);

		try {
			// Stage 2: Parse
			const parsed = await this.stageParse(documentId, filename, content, mimeType);

			// Stage 3: Chunk
			const chunked = await this.stageChunk(parsed, chunkOptions);

			// Stage 4: Embed (optional)
			let embedded: EmbeddedPipelineDocument;
			if (embeddingFn) {
				embedded = await this.stageEmbed(chunked, embeddingFn);
			} else {
				embedded = {
					...chunked,
					embeddings: [],
				};
			}

			// Stage 5: Index (optional)
			if (indexFn) {
				const result = await this.stageIndex(embedded, indexFn);
				this.progress.complete(documentId);
				return result;
			}

			this.progress.complete(documentId);
			return {
				...embedded,
				indexResults: [],
			};
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.progress.fail(documentId, "parse", err.message);

			// Push to DLQ
			const doc: PipelineDocument = {
				id: documentId,
				sourceUri,
				title: filename,
				rawContent: content,
				mimeType: mimeType ?? "application/octet-stream",
				fileType: detectFileType(filename, mimeType),
				metadata: {},
			};
			this.dlq.push(doc, "parse", err);

			throw err;
		}
	}

	/**
	 * Run the full pipeline on a URL (crawl → parse → chunk → embed → index).
	 */
	async processUrl(
		url: string,
		crawlOptions?: Partial<CrawlOptions>,
		chunkOptions?: Partial<ChunkerOptions>,
		embeddingFn?: (chunks: string[]) => Promise<number[][]>,
		indexFn?: (
			documents: Array<{
				text: string;
				embedding?: number[];
				metadata: Record<string, unknown>;
			}>,
		) => Promise<Array<{ chunkIndex: number; indexedId: string; success: boolean }>>,
	): Promise<IndexedPipelineDocument[]> {
		const results: IndexedPipelineDocument[] = [];

		try {
			// Stage 1: Crawl
			const documents = await this.stageCrawl(url, crawlOptions);

			for (const doc of documents) {
				this.progress.start(doc.id, doc.sourceUri);

				try {
					// Stage 2: Parse
					const parsed = await this.stageParseFromDoc(doc);

					// Stage 3: Chunk
					const chunked = await this.stageChunk(parsed, chunkOptions);

					// Stage 4: Embed (optional)
					let embedded: EmbeddedPipelineDocument;
					if (embeddingFn) {
						embedded = await this.stageEmbed(chunked, embeddingFn);
					} else {
						embedded = { ...chunked, embeddings: [] };
					}

					// Stage 5: Index (optional)
					if (indexFn) {
						const result = await this.stageIndex(embedded, indexFn);
						results.push(result);
					} else {
						results.push({ ...embedded, indexResults: [] });
					}

					this.progress.complete(doc.id);
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.progress.fail(doc.id, "parse", err.message);
					this.dlq.push(doc, "parse", err);
				}
			}
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error(`[Pipeline] Crawl failed for ${url}: ${err.message}`);
		}

		return results;
	}

	/**
	 * Retry failed documents from the dead-letter queue.
	 */
	async retryFailed(
		embeddingFn?: (chunks: string[]) => Promise<number[][]>,
		indexFn?: (
			documents: Array<{
				text: string;
				embedding?: number[];
				metadata: Record<string, unknown>;
			}>,
		) => Promise<Array<{ chunkIndex: number; indexedId: string; success: boolean }>>,
	): Promise<number> {
		const records = this.dlq.popReadyForRetry();
		let successCount = 0;

		for (const record of records) {
			try {
				const result = await this.processFile(
					record.document.sourceUri,
					record.document.rawContent,
					record.document.mimeType,
					undefined,
					embeddingFn,
					indexFn,
				);

				if (result.indexResults.length > 0) {
					this.dlq.remove(record.id);
					successCount++;
					logger.info(`[Pipeline] Retry succeeded: ${record.document.sourceUri}`);
				}
			} catch (error) {
				this.dlq.retry(record);
				logger.warn(
					`[Pipeline] Retry failed: ${record.document.sourceUri} (attempt ${record.retryCount + 1}/${record.maxRetries})`,
				);
			}
		}

		return successCount;
	}

	// ─── Stage 1: Crawl ───────────────────────────────────────────

	private async stageCrawl(
		url: string,
		options?: Partial<CrawlOptions>,
	): Promise<PipelineDocument[]> {
		this.progress.update("global", "crawl", "in_progress", 10, `Crawling ${url}`);

		const documents = await crawlUrl(url, options);

		this.progress.update(
			"global",
			"crawl",
			"completed",
			100,
			`Crawled ${documents.length} pages`,
		);

		return documents;
	}

	// ─── Stage 2: Parse ───────────────────────────────────────────

	private async stageParse(
		documentId: string,
		filename: string,
		content: Buffer | string,
		mimeType?: string,
	): Promise<ParsedPipelineDocument> {
		this.progress.update(documentId, "parse", "in_progress", 20, `Parsing ${filename}`);

		const fileType = detectFileType(filename, mimeType);
		if (!fileType) {
			throw new Error(`Unsupported file type: ${filename}`);
		}

		const parser = parserRegistry[fileType];
		if (!parser) {
			throw new Error(`No parser for file type: ${fileType}`);
		}

		const parsed = await parser(content, filename);

		this.progress.update(
			documentId,
			"parse",
			"completed",
			40,
			`Parsed ${parsed.content.length} chars`,
		);

		return {
			id: documentId,
			sourceUri: filename,
			title: parsed.title,
			rawContent: content,
			mimeType: parsed.mimeType,
			fileType,
			metadata: parsed.metadata as Record<string, unknown>,
			parsedContent: parsed.content,
			parseMetadata: parsed.metadata as Record<string, unknown>,
		};
	}

	private async stageParseFromDoc(doc: PipelineDocument): Promise<ParsedPipelineDocument> {
		return this.stageParse(doc.id, doc.sourceUri, doc.rawContent, doc.mimeType);
	}

	// ─── Stage 3: Chunk ───────────────────────────────────────────

	private async stageChunk(
		doc: ParsedPipelineDocument,
		options?: Partial<ChunkerOptions>,
	): Promise<ChunkedPipelineDocument> {
		this.progress.update(doc.id, "chunk", "in_progress", 50, "Chunking content");

		const { chunks, metadata } = chunkTextFn(doc.parsedContent, options);

		this.progress.update(
			doc.id,
			"chunk",
			"completed",
			60,
			`Split into ${chunks.length} chunks`,
		);

		return {
			...doc,
			chunks: metadata,
			chunkStrategy: options?.strategy ?? "fixed",
		};
	}

	// ─── Stage 4: Embed ───────────────────────────────────────────

	private async stageEmbed(
		doc: ChunkedPipelineDocument,
		embeddingFn: (chunks: string[]) => Promise<number[][]>,
	): Promise<EmbeddedPipelineDocument> {
		this.progress.update(doc.id, "embed", "in_progress", 70, "Generating embeddings");

		const texts = doc.chunks.map((c) => c.text);
		const embeddings = await embeddingFn(texts);

		this.progress.update(
			doc.id,
			"embed",
			"completed",
			85,
			`Generated ${embeddings.length} embeddings (dim=${embeddings[0]?.length ?? 0})`,
		);

		return { ...doc, embeddings };
	}

	// ─── Stage 5: Index ───────────────────────────────────────────

	private async stageIndex(
		doc: EmbeddedPipelineDocument,
		indexFn: (
			documents: Array<{
				text: string;
				embedding?: number[];
				metadata: Record<string, unknown>;
			}>,
		) => Promise<Array<{ chunkIndex: number; indexedId: string; success: boolean }>>,
	): Promise<IndexedPipelineDocument> {
		this.progress.update(doc.id, "index", "in_progress", 90, "Indexing chunks");

		const indexInput = doc.chunks.map((chunk, i) => ({
			text: chunk.text,
			embedding: doc.embeddings[i],
			metadata: {
				documentId: doc.id,
				sourceUri: doc.sourceUri,
				title: doc.title,
				chunkIndex: chunk.index,
				chunkStrategy: doc.chunkStrategy,
				wordCount: chunk.wordCount,
				...doc.metadata,
			},
		}));

		const indexResults = await indexFn(indexInput);

		this.progress.update(
			doc.id,
			"index",
			"completed",
			100,
			`Indexed ${indexResults.filter((r) => r.success).length}/${indexResults.length} chunks`,
		);

		return { ...doc, indexResults };
	}
}

export { ProgressTracker } from "./progress";
export { DeadLetterQueue } from "./dlq";
