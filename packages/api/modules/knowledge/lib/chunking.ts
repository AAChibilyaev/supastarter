import {
	chunkText as docProcessorChunker,
	type ChunkerOptions as DocProcessorChunkerOptions,
	type ChunkTextResult as DocProcessorChunkResult,
	ChunkStrategy,
} from "@repo/document-processor";

export type ChunkStrategy = "fixed" | "semantic" | "markdown" | "code";

export interface TextChunk {
	chunkIndex: number;
	text: string;
	tokenCount: number;
	embedding: number[];
}

export interface ChunkOptions {
	strategy?: ChunkStrategy;
	chunkSize?: number; // max words per chunk
	minChunkSize?: number;
	maxChunkSize?: number;
	overlap?: number; // overlap words
}

const VECTOR_SIZE = 128;

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]+/gu, " ")
		.split(/\s+/)
		.filter((token) => token.length > 1);
}

function hashToken(token: string): number {
	let hash = 2166136261;
	for (let i = 0; i < token.length; i += 1) {
		hash ^= token.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return Math.abs(hash);
}

export function embedTextLocally(text: string): number[] {
	const vector = Array.from({ length: VECTOR_SIZE }, () => 0);
	const tokens = tokenize(text);
	if (tokens.length === 0) return vector;

	for (const token of tokens) {
		const idx = hashToken(token) % VECTOR_SIZE;
		vector[idx] += 1;
	}

	const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
	if (norm === 0) return vector;
	return vector.map((value) => value / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length || a.length === 0) return 0;
	let sum = 0;
	for (let i = 0; i < a.length; i += 1) {
		sum += a[i] * b[i];
	}
	return sum;
}

/**
 * Chunk text using the full @repo/document-processor pipeline.
 * Supports: fixed, semantic, markdown, code strategies.
 *
 * Falls back to local embedding for the knowledge chunk DB.
 */
export function chunkText(text: string, options?: ChunkOptions): TextChunk[] {
	const opts: Partial<DocProcessorChunkerOptions> = {};
	if (options?.strategy) opts.strategy = options.strategy;
	if (options?.chunkSize) opts.maxWords = options.chunkSize;
	if (options?.minChunkSize) opts.minChunkSize = options.minChunkSize;
	if (options?.maxChunkSize) opts.maxChunkSize = options.maxChunkSize;
	if (options?.overlap) opts.overlapWords = options.overlap;

	const result: DocProcessorChunkResult = docProcessorChunker(text, opts);

	return result.metadata.map((meta) => ({
		chunkIndex: meta.index,
		text: meta.text,
		tokenCount: meta.wordCount,
		embedding: embedTextLocally(meta.text),
	}));
}
