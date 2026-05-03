export interface ParsedDocument {
	title: string;
	content: string;
	mimeType: string;
	metadata: Record<string, unknown>;
}

export interface ChunkResult {
	chunks: string[];
	chunkCount: number;
}

export type FileType =
	| "pdf"
	| "docx"
	| "xlsx"
	| "pptx"
	| "csv"
	| "json"
	| "md"
	| "txt"
	| "epub"
	| "image"
	| "audio"
	| "video";

export const SUPPORTED_MIME_TYPES: Record<string, FileType> = {
	"application/pdf": "pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
	"text/csv": "csv",
	"application/json": "json",
	"text/markdown": "md",
	"text/plain": "txt",
	"application/epub+zip": "epub",
	// Image types
	"image/jpeg": "image",
	"image/png": "image",
	"image/webp": "image",
	"image/tiff": "image",
	"image/bmp": "image",
	// Audio types
	"audio/mpeg": "audio",
	"audio/wav": "audio",
	"audio/ogg": "audio",
	"audio/flac": "audio",
	"audio/mp4": "audio",
	"audio/x-m4a": "audio",
	"audio/webm": "audio",
	// Video types
	"video/mp4": "video",
	"video/webm": "video",
	"video/ogg": "video",
	"video/x-msvideo": "video",
	"video/quicktime": "video",
};

export function detectFileType(filename: string, mimeType?: string): FileType | null {
	if (mimeType && mimeType in SUPPORTED_MIME_TYPES) {
		return SUPPORTED_MIME_TYPES[mimeType];
	}

	const ext = filename.split(".").pop()?.toLowerCase();
	const mimeMap: Record<string, FileType> = {
		pdf: "pdf",
		docx: "docx",
		xlsx: "xlsx",
		xls: "xlsx",
		pptx: "pptx",
		ppt: "pptx",
		csv: "csv",
		json: "json",
		md: "md",
		txt: "txt",
		epub: "epub",
		// Images
		jpg: "image",
		jpeg: "image",
		png: "image",
		webp: "image",
		tiff: "image",
		tif: "image",
		bmp: "image",
		gif: "image",
		// Audio
		mp3: "audio",
		wav: "audio",
		ogg: "audio",
		flac: "audio",
		m4a: "audio",
		aac: "audio",
		wma: "audio",
		// Video
		mp4: "video",
		webm: "video",
		avi: "video",
		mov: "video",
		mkv: "video",
	};

	return mimeMap[ext ?? ""] ?? null;
}

// Exported for use in URL content parsing
export interface ParsedUrlResult extends ParsedDocument {
	sourceUrl: string;
}

// ─── Pipeline Stages ───────────────────────────────────────────

export type PipelineStage = "crawl" | "parse" | "chunk" | "embed" | "index";

export interface PipelineDocument {
	id: string;
	sourceUri: string;
	title: string;
	rawContent: Buffer | string;
	mimeType: string;
	fileType: FileType | null;
	metadata: Record<string, unknown>;
}

export interface ParsedPipelineDocument extends PipelineDocument {
	parsedContent: string;
	parseMetadata: Record<string, unknown>;
}

export interface ChunkedPipelineDocument extends ParsedPipelineDocument {
	chunks: ChunkMetadata[];
	chunkStrategy: ChunkStrategy;
}

export interface ChunkMetadata {
	index: number;
	text: string;
	wordCount: number;
	charCount: number;
}

export interface EmbeddedPipelineDocument extends ChunkedPipelineDocument {
	embeddings: number[][];
}

export interface IndexedPipelineDocument extends EmbeddedPipelineDocument {
	indexResults: Array<{ chunkIndex: number; indexedId: string; success: boolean }>;
}

// ─── Chunking Strategies ───────────────────────────────────────

export type ChunkStrategy = "fixed" | "semantic" | "markdown" | "code";

export interface ChunkerOptions {
	strategy: ChunkStrategy;
	maxWords: number;
	minChunkSize: number;
	maxChunkSize: number;
	overlapWords: number;
}

export const DEFAULT_CHUNKER_OPTIONS: ChunkerOptions = {
	strategy: "fixed",
	maxWords: 500,
	minChunkSize: 50,
	maxChunkSize: 1500,
	overlapWords: 25,
};

// ─── Pipeline Progress ─────────────────────────────────────────

export interface PipelineProgress {
	documentId: string;
	sourceUri: string;
	stage: PipelineStage;
	status: "pending" | "in_progress" | "completed" | "failed";
	progress: number; // 0-100
	message: string;
	startedAt: string;
	updatedAt: string;
	error?: string;
}

export type PipelineProgressListener = (progress: PipelineProgress) => void;

// ─── Dead Letter Queue ─────────────────────────────────────────

export interface DeadLetterRecord {
	id: string;
	documentId: string;
	sourceUri: string;
	failedStage: PipelineStage;
	error: string;
	errorStack?: string;
	document: PipelineDocument;
	retryCount: number;
	maxRetries: number;
	lastAttemptedAt: string;
	createdAt: string;
	nextRetryAt: string;
}

// ─── Crawl Config ──────────────────────────────────────────────

export interface CrawlOptions {
	maxDepth: number;
	maxPages: number;
	sameDomain: boolean;
	respectRobotsTxt: boolean;
	userAgent: string;
	timeoutMs: number;
	allowedPatterns?: RegExp[];
	excludedPatterns?: RegExp[];
}

export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
	maxDepth: 3,
	maxPages: 100,
	sameDomain: true,
	respectRobotsTxt: true,
	userAgent: "Mozilla/5.0 (compatible; AACsearchBot/1.0)",
	timeoutMs: 30000,
};

// ─── Index Config ──────────────────────────────────────────────

export interface IndexOptions {
	collectionName: string;
	embeddingModel: string;
	batchSize: number;
}

export const DEFAULT_INDEX_OPTIONS: IndexOptions = {
	collectionName: "documents",
	embeddingModel: "default",
	batchSize: 50,
};

// ─── Full Pipeline Config ──────────────────────────────────────

export interface PipelineConfig {
	crawl?: Partial<CrawlOptions>;
	chunk?: Partial<ChunkerOptions>;
	index?: Partial<IndexOptions>;
	embeddingProvider?: string;
	maxRetries: number;
	dlqPath: string;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
	maxRetries: 3,
	dlqPath: "/tmp/aacsearch-dlq",
};
