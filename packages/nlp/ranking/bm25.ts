/**
 * BM25 / BM25F ranking for AACsearch NLP pipeline.
 * Implements the Okapi BM25 ranking function.
 * Pure TypeScript — no external dependencies.
 */

export interface Bm25Parameters {
	/** BM25 k1 parameter — controls term frequency saturation (default: 1.2) */
	k1: number;
	/** BM25 b parameter — controls document length normalization (default: 0.75) */
	b: number;
	/** BM25F field boost configuration (for BM25F) */
	fieldBoosts?: Record<string, number>;
	/** BM25 k3 parameter for query term frequency (default: 500) */
	k3: number;
}

const DEFAULT_PARAMS: Bm25Parameters = {
	k1: 1.2,
	b: 0.75,
	k3: 500,
};

export interface DocumentStats {
	/** Total number of documents in the collection */
	totalDocs: number;
	/** Average document length (in tokens) */
	avgDocLength: number;
	/** Document frequency: term → number of docs containing it */
	docFreq: Map<string, number>;
}

export interface ScoredDocument {
	id: string;
	score: number;
	fields: Record<string, number>;
}

/**
 * BM25 ranker — Okapi BM25 scoring function.
 */
export class Bm25Ranker {
	private params: Bm25Parameters;
	private stats: DocumentStats;

	constructor(stats: DocumentStats, params: Partial<Bm25Parameters> = {}) {
		this.params = { ...DEFAULT_PARAMS, ...params };
		this.stats = stats;
	}

	/**
	 * Calculate BM25 score for a single term in a document.
	 */
	private termScore(termFreq: number, docLength: number, docFreq: number): number {
		const { totalDocs, avgDocLength } = this.stats;
		const { k1, b } = this.params;

		// Inverse Document Frequency
		const idf = Math.log((totalDocs - docFreq + 0.5) / (docFreq + 0.5) + 1);

		// Term Frequency saturation
		const tfNumerator = termFreq * (k1 + 1);
		const tfDenominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));

		return idf * (tfNumerator / tfDenominator);
	}

	/**
	 * Score a single document against a query.
	 * @param queryTerms — the tokenized query terms
	 * @param termFreqs — map of term → frequency in this document
	 * @param docLength — document length in tokens
	 */
	scoreDocument(queryTerms: string[], termFreqs: Map<string, number>, docLength: number): number {
		let score = 0;

		for (const term of queryTerms) {
			const tf = termFreqs.get(term) || 0;
			if (tf === 0) continue;

			const df = this.stats.docFreq.get(term) || 0;
			if (df === 0) continue;

			score += this.termScore(tf, docLength, df);
		}

		return score;
	}

	/**
	 * Score multiple documents against a query.
	 */
	scoreDocuments(
		queryTerms: string[],
		documents: Array<{
			id: string;
			termFreqs: Map<string, number>;
			length: number;
		}>,
	): ScoredDocument[] {
		return documents.map((doc) => ({
			id: doc.id,
			score: this.scoreDocument(queryTerms, doc.termFreqs, doc.length),
			fields: {},
		}));
	}

	/**
	 * Rank documents by BM25 score (descending).
	 */
	rank(
		queryTerms: string[],
		documents: Array<{
			id: string;
			termFreqs: Map<string, number>;
			length: number;
		}>,
		topK?: number,
	): ScoredDocument[] {
		const scored = this.scoreDocuments(queryTerms, documents);
		scored.sort((a, b) => b.score - a.score);
		return topK ? scored.slice(0, topK) : scored;
	}

	/**
	 * BM25F — per-field BM25 with weighted field boosts.
	 */
	scoreDocumentBm25f(
		queryTerms: string[],
		fieldTermFreqs: Map<string, Map<string, number>>,
		fieldLengths: Map<string, number>,
	): number {
		const boosts = this.params.fieldBoosts || {};
		let score = 0;

		for (const term of queryTerms) {
			let combinedTf = 0;
			let combinedLength = 0;

			for (const [field, termFreqs] of fieldTermFreqs.entries()) {
				const boost = boosts[field] || 1.0;
				const tf = (termFreqs.get(term) || 0) * boost;
				const length = fieldLengths.get(field) || 0;

				combinedTf += tf;
				combinedLength += length * boost;
			}

			if (combinedTf === 0) continue;

			const df = this.stats.docFreq.get(term) || 0;
			if (df === 0) continue;

			const idf = Math.log((this.stats.totalDocs - df + 0.5) / (df + 0.5) + 1);

			const tfNumerator = combinedTf * (this.params.k1 + 1);
			const tfDenominator =
				combinedTf +
				this.params.k1 *
					(1 - this.params.b + this.params.b * (combinedLength / this.stats.avgDocLength));

			score += idf * (tfNumerator / tfDenominator);
		}

		return score;
	}
}

/**
 * Build document frequency map from a corpus.
 */
export function buildDocFreq(
	documents: Array<{
		id: string;
		terms: string[];
	}>,
): DocumentStats {
	const docFreq = new Map<string, number>();
	let totalLength = 0;

	for (const doc of documents) {
		const uniqueTerms = new Set(doc.terms);
		for (const term of uniqueTerms) {
			docFreq.set(term, (docFreq.get(term) || 0) + 1);
		}
		totalLength += doc.terms.length;
	}

	return {
		totalDocs: documents.length,
		avgDocLength: documents.length > 0 ? totalLength / documents.length : 0,
		docFreq,
	};
}
