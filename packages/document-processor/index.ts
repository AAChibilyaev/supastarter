export { processFile, processUrl, detectFileType, SUPPORTED_MIME_TYPES } from "./lib/processor";
export { chunkText } from "./lib/chunker";
export type { ParsedDocument, FileType, ChunkResult } from "./lib/types";
export type {
	ProcessFileInput,
	ProcessFileResult,
	ProcessUrlInput,
	ProcessUrlResult,
} from "./lib/processor";
