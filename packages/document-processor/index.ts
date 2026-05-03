export { processFile, processUrl, detectFileType, SUPPORTED_MIME_TYPES } from "./lib/processor";
export { chunkText } from "./lib/chunker";
export type { ChunkTextResult } from "./lib/chunker";
export type { ChunkerOptions } from "./lib/chunker";
export type { ProcessFileResult, ProcessFileInput, ProcessUrlResult } from "./lib/processor";

// Pipeline exports
export { DocumentPipeline } from "./lib/pipeline";
export { ProgressTracker } from "./lib/progress";
export { DeadLetterQueue } from "./lib/dlq";
export { crawlUrl } from "./lib/crawler";
export { processFileToPipeline, processUrlToPipeline } from "./lib/search-bridge";

// Parser exports (for advanced use)
export {
	parsePdf,
	parseDocx,
	parseXlsx,
	parsePptx,
	parseCsv,
	parseJson,
	parseMd,
	parseTxt,
	parseEpub,
	parseImage,
	parseAudio,
	parseVideo,
} from "./lib/parsers/index";

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
