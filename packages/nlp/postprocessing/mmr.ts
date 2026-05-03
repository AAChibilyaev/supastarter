/**
 * MMR (Maximum Marginal Relevance) diversification.
 * Reduces redundancy in search results by penalizing
 * results that are too similar to higher-ranked results.
 * Pure TypeScript — no external dependencies.
 */

export interface MMRDocument {
	id: string;
	score: number;
	/** Term frequency vector for similarity computation */
	vector: Map<string, number>;
	/** Optional vector norm (computed if not provided) */
	vectorNorm?: number;
}

export interface MMROptions {
	/**
	 * Lambda parameter (0-1) controlling the trade-off:
	 * 1 = pure relevance, 0 = pure diversity
	 */
	lambda: number;
	/** Maximum number of results to return */
	maxResults: number;
	/** Similarity metric: 'cosine' or 'jaccard' */
	metric: "cosine" | "jaccard";
}

const DEFAULT_OPTIONS: MMROptions = {
	lambda: 0.5,
	maxResults: 20,
	metric: "cosine",
};

/**
 * Calculate cosine similarity between two term vectors.
 */
function cosineSimilarity(
	a: Map<string, number>,
	b: Map<string, number>,
	aNorm: number,
	bNorm: number,
): number {
	if (aNorm === 0 || bNorm === 0) return 0;

	let dotProduct = 0;
	for (const [term, weightA] of a) {
		const weightB = b.get(term);
		if (weightB) {
			dotProduct += weightA * weightB;
		}
	}

	return dotProduct / (aNorm * bNorm);
}

/**
 * Calculate Jaccard similarity between two term vector key sets.
 */
function jaccardVectorSimilarity(
	a: Map<string, number>,
	b: Map<string, number>,
): number {
	const setA = new Set(a.keys());
	const setB = new Set(b.keys());

	let intersection = 0;
	for (const key of setA) {
		if (setB.has(key)) intersection++;
	}

	const union = new Set([...setA, ...setB]);
	if (union.size === 0) return 0;

	return intersection / union.size;
}

/**
 * Compute the L2 norm of a term vector.
 */
export function vectorNorm(vector: Map<string, number>): number {
	let sumSquares = 0;
	for (const weight of vector.values()) {
		sumSquares += weight * weight;
	}
	return Math.sqrt(sumSquares);
}

/**
 * Apply MMR diversification to a ranked list of documents.
 */
export function mmrDiversify(
	documents: MMRDocument[],
	options?: Partial<MMROptions>,
): MMRDocument[] {
	if (documents.length <= 1) return documents;

	const opts = { ...DEFAULT_OPTIONS, ...options };
	const { lambda, maxResults, metric } = opts;

	// Sort by relevance score initially
	const sorted = [...documents].sort((a, b) => b.score - a.score);

	// Ensure all vectors have norms computed
	for (const doc of sorted) {
		if (doc.vectorNorm === undefined) {
			doc.vectorNorm = vectorNorm(doc.vector);
		}
	}

	const selected: MMRDocument[] = [];
	const candidates = [...sorted];

	// Greedy MMR: always pick the first (most relevant) document
	selected.push(candidates.shift()!);

	while (selected.length < maxResults && candidates.length > 0) {
		let bestScore = -Infinity;
		let bestIdx = -1;

		for (let i = 0; i < candidates.length; i++) {
			const candidate = candidates[i]!;

			// Relevance term: the original score
			const relevance = candidate.score;

			// Diversity term: max similarity to any selected document
			let maxSim = 0;
			for (const sel of selected) {
				let sim: number;
				if (metric === "cosine") {
					sim = cosineSimilarity(
						candidate.vector,
						sel.vector,
						candidate.vectorNorm!,
						sel.vectorNorm!,
					);
				} else {
					sim = jaccardVectorSimilarity(
						candidate.vector,
						sel.vector,
					);
				}
				if (sim > maxSim) maxSim = sim;
			}

			// MMR score: λ * relevance - (1-λ) * maxSimilarity
			const mmrScore = lambda * relevance - (1 - lambda) * maxSim;

			if (mmrScore > bestScore) {
				bestScore = mmrScore;
				bestIdx = i;
			}
		}

		if (bestIdx >= 0) {
			selected.push(candidates.splice(bestIdx, 1)[0]!);
		} else {
			break;
		}
	}

	return selected;
}
