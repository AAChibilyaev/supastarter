/**
 * Feature extractors for ranking — recency, popularity, freshness, CTR.
 * Provides scalar feature values that can be used as ranking signals.
 * Pure TypeScript — no external dependencies.
 */

export interface RankingFeatures {
	recency: number; // 0-1, how recent the document is
	popularity: number; // 0-1, based on views/clicks
	freshness: number; // 0-1, how frequently updated
	ctr: number; // 0-1, click-through rate
	authority: number; // 0-1, domain/source authority
	completeness: number; // 0-1, how complete the document fields are
}

export interface FeatureWeights {
	recency: number;
	popularity: number;
	freshness: number;
	ctr: number;
	authority: number;
	completeness: number;
}

const DEFAULT_WEIGHTS: FeatureWeights = {
	recency: 0.15,
	popularity: 0.25,
	freshness: 0.1,
	ctr: 0.2,
	authority: 0.2,
	completeness: 0.1,
};

/**
 * Calculate age-based recency score (0-1).
 * Uses exponential decay: newer docs get higher scores.
 */
export function recencyScore(createdAt: Date | number, halfLifeDays: number = 30): number {
	const created = createdAt instanceof Date ? createdAt.getTime() : createdAt;
	const ageMs = Date.now() - created;
	const ageDays = ageMs / (1000 * 60 * 60 * 24);
	return Math.pow(0.5, ageDays / halfLifeDays);
}

/**
 * Calculate popularity score (0-1) using log scaling.
 */
export function popularityScore(totalViews: number, maxViews: number): number {
	if (maxViews <= 0) return 0;
	const ratio = totalViews / maxViews;
	// Log scaling to avoid linear dominance
	return Math.log10(1 + ratio * 9);
}

/**
 * Calculate freshness score (0-1) based on update frequency.
 */
export function freshnessScore(updatesPerDay: number, maxUpdates: number = 10): number {
	return Math.min(updatesPerDay / maxUpdates, 1);
}

/**
 * Calculate CTR score (0-1).
 */
export function ctrScore(clicks: number, impressions: number): number {
	if (impressions <= 0) return 0;
	const raw = clicks / impressions;
	// Smooth with Bayesian prior
	const prior = 0.05; // 5% prior CTR
	const priorWeight = 10; // equivalent to 10 impressions
	return (clicks + prior * priorWeight) / (impressions + priorWeight);
}

/**
 * Calculate authority score (0-1) based on domain/link signals.
 */
export function authorityScore(
	inboundLinks: number,
	maxInbound: number = 1000,
	pageRank?: number,
): number {
	const linkScore = maxInbound > 0 ? Math.min(inboundLinks / maxInbound, 1) : 0;

	if (pageRank !== undefined) {
		return linkScore * 0.4 + pageRank * 0.6;
	}
	return linkScore;
}

/**
 * Calculate completeness score based on how many fields are populated.
 */
export function completenessScore(
	fields: Record<string, unknown>,
	requiredFields: string[],
): number {
	if (requiredFields.length === 0) return 1;

	let filled = 0;
	for (const field of requiredFields) {
		const value = fields[field];
		if (value !== null && value !== undefined && value !== "") {
			filled++;
		}
	}

	return filled / requiredFields.length;
}

/**
 * Extract all ranking features for a document.
 */
export function extractFeatures(
	doc: {
		createdAt?: Date | number;
		updatedAt?: Date | number;
		views?: number;
		clicks?: number;
		impressions?: number;
		inboundLinks?: number;
		updatesPerDay?: number;
		fields?: Record<string, unknown>;
		requiredFields?: string[];
	},
	corpusStats?: {
		maxViews: number;
		maxInbound: number;
	},
): RankingFeatures {
	return {
		recency: doc.createdAt ? recencyScore(doc.createdAt) : 0.5,
		popularity:
			corpusStats?.maxViews && doc.views
				? popularityScore(doc.views, corpusStats.maxViews)
				: 0,
		freshness: doc.updatesPerDay ? freshnessScore(doc.updatesPerDay) : 0,
		ctr:
			doc.clicks !== undefined && doc.impressions ? ctrScore(doc.clicks, doc.impressions) : 0,
		authority:
			doc.inboundLinks && corpusStats?.maxInbound
				? authorityScore(doc.inboundLinks, corpusStats.maxInbound)
				: 0,
		completeness:
			doc.fields && doc.requiredFields
				? completenessScore(doc.fields, doc.requiredFields)
				: 0.5,
	};
}

/**
 * Combine BM25 score with feature scores using weights.
 */
export function combineWithFeatures(
	bm25Score: number,
	features: RankingFeatures,
	weights: Partial<FeatureWeights> = {},
): number {
	const w = { ...DEFAULT_WEIGHTS, ...weights };

	const featureScore =
		w.recency * features.recency +
		w.popularity * features.popularity +
		w.freshness * features.freshness +
		w.ctr * features.ctr +
		w.authority * features.authority +
		w.completeness * features.completeness;

	// BM25 normally dominates; features add a boost factor
	return bm25Score * (1 + featureScore * 0.3);
}
