/**
 * TF-IDF scoring and vector space model for ranking.
 * Pure TypeScript — no external dependencies.
 */

import type { DocumentStats } from "./bm25";

export interface TfIdfVector {
	terms: Map<string, number>;
	norm: number;
}

/**
 * TF-IDF score calculator using a vector space model.
 */
export class TfIdfRanker {
	private stats: DocumentStats;
	private idfCache: Map<string, number>;

	constructor(stats: DocumentStats) {
		this.stats = stats;
		this.idfCache = new Map();
	}

	/**
	 * Calculate IDF for a term.
	 */
	idf(term: string): number {
		if (this.idfCache.has(term)) {
			return this.idfCache.get(term)!;
		}

		const df = this.stats.docFreq.get(term) || 0;
		const value = df > 0
			? Math.log(this.stats.totalDocs / (df + 1)) + 1
			: 1;

		this.idfCache.set(term, value);
		return value;
	}

	/**
	 * Calculate TF (term frequency) with optional log normalization.
	 */
	tf(count: number, docLength: number, logNormalize: boolean = true): number {
		if (count === 0 || docLength === 0) return 0;
		if (logNormalize) {
			return 1 + Math.log(count);
		}
		return count / docLength;
	}

	/**
	 * Calculate TF-IDF weight for a single term.
	 */
	tfidf(termFreq: number, docLength: number, term: string): number {
		return this.tf(termFreq, docLength) * this.idf(term);
	}

	/**
	 * Build a TF-IDF vector for a document.
	 */
	buildVector(
		termFreqs: Map<string, number>,
		docLength: number,
	): TfIdfVector {
		const terms = new Map<string, number>();
		let sumSquares = 0;

		for (const [term, count] of termFreqs) {
			const weight = this.tfidf(count, docLength, term);
			terms.set(term, weight);
			sumSquares += weight * weight;
		}

		return {
			terms,
			norm: Math.sqrt(sumSquares),
		};
	}

	/**
	 * Calculate cosine similarity between two TF-IDF vectors.
	 */
	cosineSimilarity(a: TfIdfVector, b: TfIdfVector): number {
		if (a.norm === 0 || b.norm === 0) return 0;

		let dotProduct = 0;
		for (const [term, weightA] of a.terms) {
			const weightB = b.terms.get(term);
			if (weightB) {
				dotProduct += weightA * weightB;
			}
		}

		return dotProduct / (a.norm * b.norm);
	}

	/**
	 * Score a document vector against a query vector.
	 */
	score(queryVector: TfIdfVector, docVector: TfIdfVector): number {
		return this.cosineSimilarity(queryVector, docVector);
	}

	/**
	 * Rank documents by cosine similarity to a query.
	 */
	rank(
		queryVector: TfIdfVector,
		documents: Array<{
			id: string;
			vector: TfIdfVector;
		}>,
		topK?: number,
	): Array<{ id: string; score: number }> {
		const results = documents.map((doc) => ({
			id: doc.id,
			score: this.score(queryVector, doc.vector),
		}));

		results.sort((a, b) => b.score - a.score);
		return topK ? results.slice(0, topK) : results;
	}
}

/**
 * Extract term frequencies from a text.
 */
export function extractTermFreqs(text: string): Map<string, number> {
	const freqs = new Map<string, number>();
	if (!text) return freqs;

	const terms = text
		.toLowerCase()
		.split(/\s+/)
		.map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
		.filter(Boolean);

	for (const term of terms) {
		freqs.set(term, (freqs.get(term) || 0) + 1);
	}

	return freqs;
}
