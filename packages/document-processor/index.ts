export { processFile, processUrl, detectFileType, SUPPORTED_MIME_TYPES } from "./lib/processor";
export { chunkText } from "./lib/chunker";
export type { ChunkTextResult } from "./lib/chunker";
export type { ProcessFileResult, ProcessFileInput, ProcessUrlResult } from "./lib/processor";

// Pipeline exports
export { DocumentPipeline } from "./lib/pipeline";
export { ProgressTracker } from "./lib/progress";
export { DeadLetterQueue } from "./lib/dlq";
export { crawlUrl } from "./lib/crawler";
export { parseSitemap, discoverSitemapsFromRobotsTxt } from "./lib/sitemap";
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
	parseVideoMoments,
} from "./lib/parsers/index";

export type { VideoMoment, ParsedVideoMoments } from "./lib/parsers/video-moments";

// Type exports
export type {
	ParsedDocument,
	ParsedUrlResult,
	ChunkResult,
	FileType,
	ChunkMetadata,
	ChunkStrategy,
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
	ChunkerOptions,
	CrawlOptions,
	IndexOptions,
} from "./lib/types";
