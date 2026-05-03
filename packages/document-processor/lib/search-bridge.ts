import { logger } from "@repo/logs";

import { DocumentPipeline } from "./pipeline";
import type { IndexedPipelineDocument } from "./types";

export type { DocumentPipeline } from "./pipeline";

/**
 * Process a file buffer through the pipeline and return results.
 * Embedding + indexing is optional — callers can provide their own functions.
 */
export async function processFileToPipeline(
	filename: string,
	content: Buffer | string,
	mimeType?: string,
	embeddingFn?: (chunks: string[]) => Promise<number[][]>,
	indexFn?: (
		documents: Array<{
			text: string;
			embedding?: number[];
			metadata: Record<string, unknown>;
		}>,
	) => Promise<Array<{ chunkIndex: number; indexedId: string; success: boolean }>>,
): Promise<IndexedPipelineDocument> {
	const pipeline = new DocumentPipeline();
	return pipeline.processFile(filename, content, mimeType, undefined, embeddingFn, indexFn);
}

/**
 * Process a URL through the pipeline (crawl → parse → chunk → embed → index).
 */
export async function processUrlToPipeline(
	url: string,
	maxDepth = 1,
	maxPages = 25,
	embeddingFn?: (chunks: string[]) => Promise<number[][]>,
	indexFn?: (
		documents: Array<{
			text: string;
			embedding?: number[];
			metadata: Record<string, unknown>;
		}>,
	) => Promise<Array<{ chunkIndex: number; indexedId: string; success: boolean }>>,
): Promise<IndexedPipelineDocument[]> {
	const pipeline = new DocumentPipeline();
	return pipeline.processUrl(
		url,
		{ maxDepth, maxPages, sameDomain: true },
		undefined,
		embeddingFn,
		indexFn,
	);
}
