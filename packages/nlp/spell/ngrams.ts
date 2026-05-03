import { generateNGrams, generateEdgeNGrams } from "../preprocessing/tokenization";
/**
 * N-gram analysis for fuzzy matching and spell correction.
 * Provides trigram index, shingle matching, and edge n-gram generation.
 */
import { sorensenDiceCoefficient } from "./distances";

export { generateNGrams, generateEdgeNGrams };

/**
 * Trigram index for fast fuzzy matching using Sørensen-Dice coefficient.
 */
export class TrigramsIndex {
	private trigramMap: Map<string, Set<string>> = new Map();
	private words: Set<string> = new Set();
	private isBuilt = false;

	/**
	 * Index a list of words by their trigrams.
	 */
	public buildIndex(words: string[]): void {
		this.isBuilt = true;
		for (const word of words) {
			const lower = word.toLowerCase();
			this.words.add(lower);

			const trigrams = generateNGrams(lower, 3);
			for (const trigram of trigrams) {
				const existing = this.trigramMap.get(trigram);
				if (existing) {
					existing.add(lower);
				} else {
					this.trigramMap.set(trigram, new Set([lower]));
				}
			}
		}
	}

	/**
	 * Search the index for words matching the query above a similarity threshold.
	 * Uses Sørensen-Dice coefficient on trigrams.
	 */
	public search(query: string, threshold = 0.4): string[] {
		if (!this.isBuilt || !query) return [];

		const lowerQuery = query.toLowerCase();
		const queryTrigrams = generateNGrams(lowerQuery, 3);

		if (queryTrigrams.length === 0) return [];

		// Score each unique word in the index by trigram overlap
		const scores = new Map<string, number>();

		for (const trigram of queryTrigrams) {
			const matchingWords = this.trigramMap.get(trigram);
			if (!matchingWords) continue;

			for (const word of matchingWords) {
				scores.set(word, (scores.get(word) ?? 0) + 1);
			}
		}

		// Filter by Sørensen-Dice similarity
		const results: { word: string; score: number }[] = [];
		for (const [word] of scores) {
			const diceScore = 1 - sorensenDiceCoefficient(lowerQuery, word);
			if (diceScore >= threshold) {
				results.push({ word, score: diceScore });
			}
		}

		return results.sort((a, b) => b.score - a.score).map((r) => r.word);
	}

	/**
	 * Get the total number of unique words in the index.
	 */
	public get size(): number {
		return this.words.size;
	}

	/**
	 * Check if the index has been built.
	 */
	public get ready(): boolean {
		return this.isBuilt;
	}
}

/**
 * Shingle-based text matching using Jaccard similarity.
 * Useful for document-level similarity comparison.
 */
export class ShingleMatcher {
	/**
	 * Compute Jaccard similarity between two texts using shingles of given size.
	 * @param text1 - First text
	 * @param text2 - Second text
	 * @param shingleSize - Number of characters per shingle (default: 3)
	 * @returns Similarity score from 0.0 to 1.0
	 */
	public match(text1: string, text2: string, shingleSize = 3): number {
		if (!text1 && !text2) return 1;
		if (!text1 || !text2) return 0;

		const shingles1 = this.getShingles(text1.toLowerCase(), shingleSize);
		const shingles2 = this.getShingles(text2.toLowerCase(), shingleSize);

		if (shingles1.size === 0 && shingles2.size === 0) return 1;
		if (shingles1.size === 0 || shingles2.size === 0) return 0;

		let intersection = 0;
		for (const shingle of shingles1) {
			if (shingles2.has(shingle)) intersection++;
		}

		const union = shingles1.size + shingles2.size - intersection;
		return intersection / union;
	}

	/**
	 * Find the best matching position of query within text using shingle overlap.
	 */
	public findBestMatch(
		text: string,
		query: string,
		shingleSize = 3,
	): {
		position: number;
		similarity: number;
	} {
		if (!text || !query) return { position: 0, similarity: 0 };

		const queryShingles = this.getShingles(query.toLowerCase(), shingleSize);
		if (queryShingles.size === 0) return { position: 0, similarity: 0 };

		let bestPosition = 0;
		let bestSimilarity = 0;

		for (let i = 0; i <= text.length - shingleSize; i++) {
			const window = text.slice(i, i + query.length + shingleSize);
			if (window.length < shingleSize) break;

			const windowShingles = this.getShingles(window.toLowerCase(), shingleSize);
			let intersection = 0;
			for (const shingle of queryShingles) {
				if (windowShingles.has(shingle)) intersection++;
			}

			const similarity = intersection / (queryShingles.size + windowShingles.size - intersection);
			if (similarity > bestSimilarity) {
				bestSimilarity = similarity;
				bestPosition = i;
			}
		}

		return { position: bestPosition, similarity: bestSimilarity };
	}

	private getShingles(text: string, size: number): Set<string> {
		const shingles = new Set<string>();
		for (let i = 0; i <= text.length - size; i++) {
			shingles.add(text.slice(i, i + size));
		}
		return shingles;
	}
}
