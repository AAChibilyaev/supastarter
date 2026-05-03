/**
 * Word2Vec / embedding-based synonym expansion.
 * Cosine similarity computation and nearest-neighbor word lookup.
 * Supports in-memory vectors and external embedding providers.
 */

import type { SynonymResult } from "./wordnet";

export interface EmbeddingVector {
	word: string;
	vector: number[];
}

/**
 * Interface for external embedding providers (OpenAI, HuggingFace, etc.).
 */
export interface EmbeddingProvider {
	/**
	 * Generate an embedding vector for a given text.
	 */
	embed(text: string): Promise<number[]>;

	/**
	 * Optional: batch embed multiple texts.
	 */
	embedBatch?(texts: string[]): Promise<number[][]>;

	/**
	 * Provider name for logging/tracking.
	 */
	readonly name: string;
}

/**
 * Calculate cosine similarity between two vectors.
 * Returns a value between -1.0 and 1.0 (1.0 = identical direction).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
	}

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
	if (magnitude === 0) {
		return 0;
	}

	return dotProduct / magnitude;
}

/**
 * Calculate Euclidean (L2) distance between two vectors.
 */
export function euclideanDistance(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
	}

	let sum = 0;
	for (let i = 0; i < a.length; i++) {
		const diff = a[i] - b[i];
		sum += diff * diff;
	}

	return Math.sqrt(sum);
}

/**
 * In-memory word embedding store for synonym expansion.
 * Maps words to their vector representations and supports
 * nearest-neighbor queries.
 */
export class WordEmbeddingStore {
	private vectors: Map<string, number[]> = new Map();

	constructor(
		private options: {
			/** Default dimension for new vectors */
			dimension?: number;
			/** Similarity threshold for nearest neighbors (0.0-1.0) */
			minSimilarity?: number;
		} = {},
	) {}

	/**
	 * Add a word vector to the store.
	 */
	add(word: string, vector: number[]): void {
		this.vectors.set(word.toLowerCase().trim(), vector);
	}

	/**
	 * Add multiple word vectors at once.
	 */
	addBatch(entries: EmbeddingVector[]): void {
		for (const entry of entries) {
			this.add(entry.word, entry.vector);
		}
	}

	/**
	 * Get the vector for a word.
	 */
	get(word: string): number[] | undefined {
		return this.vectors.get(word.toLowerCase().trim());
	}

	/**
	 * Check if a word exists in the store.
	 */
	has(word: string): boolean {
		return this.vectors.has(word.toLowerCase().trim());
	}

	/**
	 * Find nearest neighbor words by cosine similarity.
	 */
	findNearest(
		word: string,
		options?: {
			maxResults?: number;
			minSimilarity?: number;
		},
	): SynonymResult[] {
		const query = word.toLowerCase().trim();
		const queryVector = this.vectors.get(query);

		if (!queryVector) {
			return [];
		}

		const maxResults = options?.maxResults ?? 10;
		const minSimilarity = options?.minSimilarity ?? this.options.minSimilarity ?? 0.5;

		const scored: Array<{ word: string; similarity: number }> = [];

		for (const [candidateWord, candidateVector] of this.vectors) {
			if (candidateWord === query) continue;

			const similarity = cosineSimilarity(queryVector, candidateVector);

			if (similarity >= minSimilarity) {
				scored.push({ word: candidateWord, similarity });
			}
		}

		// Sort by similarity descending
		scored.sort((a, b) => b.similarity - a.similarity);

		return scored.slice(0, maxResults).map((s) => ({
			word: s.word,
			source: "embeddings" as const,
			similarity: Math.round(s.similarity * 100) / 100,
		}));
	}

	/**
	 * Find nearest neighbors from a raw query vector.
	 */
	findNearestByVector(
		queryVector: number[],
		options?: {
			maxResults?: number;
			minSimilarity?: number;
		},
	): SynonymResult[] {
		const maxResults = options?.maxResults ?? 10;
		const minSimilarity = options?.minSimilarity ?? this.options.minSimilarity ?? 0.5;

		const scored: Array<{ word: string; similarity: number }> = [];

		for (const [candidateWord, candidateVector] of this.vectors) {
			const similarity = cosineSimilarity(queryVector, candidateVector);

			if (similarity >= minSimilarity) {
				scored.push({ word: candidateWord, similarity });
			}
		}

		scored.sort((a, b) => b.similarity - a.similarity);

		return scored.slice(0, maxResults).map((s) => ({
			word: s.word,
			source: "embeddings" as const,
			similarity: Math.round(s.similarity * 100) / 100,
		}));
	}

	/**
	 * Load vectors from an external embedding provider.
	 * Given a list of words, generates embeddings and stores them.
	 */
	async loadFromProvider(provider: EmbeddingProvider, words: string[]): Promise<number> {
		let loaded = 0;

		if (provider.embedBatch) {
			// Batch mode
			const batchSize = 20;
			for (let i = 0; i < words.length; i += batchSize) {
				const batch = words.slice(i, i + batchSize);
				const vectors = await provider.embedBatch(batch);
				for (let j = 0; j < batch.length; j++) {
					this.add(batch[j], vectors[j]);
					loaded++;
				}
			}
		} else {
			// Single mode
			for (const word of words) {
				const vector = await provider.embed(word);
				this.add(word, vector);
				loaded++;
			}
		}

		return loaded;
	}

	/**
	 * Number of word vectors in the store.
	 */
	get size(): number {
		return this.vectors.size;
	}

	/**
	 * Clear all stored vectors.
	 */
	clear(): void {
		this.vectors.clear();
	}
}

/**
 * Computes Word Mover's Distance (WMD) between two texts using
 * word embeddings. Lower distance = more semantically similar.
 *
 * Simplified implementation using cosine distance and greedy matching.
 */
export function wordMoversDistance(
	text1: string,
	text2: string,
	store: WordEmbeddingStore,
): number {
	const words1 = text1.toLowerCase().split(/\s+/).filter(Boolean);
	const words2 = text2.toLowerCase().split(/\s+/).filter(Boolean);

	if (words1.length === 0 || words2.length === 0) {
		return Infinity;
	}

	const vecs1 = words1.map((w) => store.get(w)).filter(Boolean) as number[][];
	const vecs2 = words2.map((w) => store.get(w)).filter(Boolean) as number[][];

	if (vecs1.length === 0 || vecs2.length === 0) {
		return Infinity;
	}

	// Compute average pairwise cosine distance (greedy approximation)
	let totalDistance = 0;
	const used2 = new Set<number>();

	for (const v1 of vecs1) {
		let minDist = Infinity;

		for (let j = 0; j < vecs2.length; j++) {
			if (used2.has(j)) continue;

			const sim = cosineSimilarity(v1, vecs2[j]);
			const dist = 1 - sim; // Convert similarity to distance

			if (dist < minDist) {
				minDist = dist;
			}
		}

		if (minDist < Infinity) {
			totalDistance += minDist;
		}
	}

	return totalDistance / vecs1.length;
}
