export { processFile, processUrl, detectFileType, SUPPORTED_MIME_TYPES } from "./lib/processor";
export { chunkText } from "./lib/chunker";
export type { ChunkTextResult } from "./lib/chunker";
export type { ChunkerOptions } from "./lib/chunker";

// Pipeline exports
export { DocumentPipeline } from "./lib/pipeline";
export { ProgressTracker } from "./lib/progress";
export { DeadLetterQueue } from "./lib/dlq";
export { crawlUrl } from "./lib/crawler";

// Type exports
export type {
	ParsedDocument,
	ParsedUrlResult,
	ChunkResult,
	FileType,
	ChunkMetadata,
	// Pipeline types
	PipelineDocument,
	ParsedPipelineDocument,
	ChunkedPipelineDocument,
	EmbeddedPipelineDocument,
	IndexedPipelineDocument,
	PipelineProgress,
	DeadLetterRecord,
	PipelineStage,
	PipelineConfig,
	ChunkStrategy,
	ChunkerOptions as ChunkerOptionsType,
	CrawlOptions,
	IndexOptions,
} from "./lib/types";
