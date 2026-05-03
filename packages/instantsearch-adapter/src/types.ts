/**
 * @aacsearch/instantsearch-adapter — Algolia InstantSearch-compatible types
 *
 * Minimal type definitions matching the InstantSearch.js search client contract
 * that the adapter needs to implement. We don't re-export types from the
 * InstantSearch.js package to avoid a hard peer dependency.
 *
 * @see https://www.algolia.com/doc/rest-api/search/
 * @module @aacsearch/instantsearch-adapter
 */

// ─── Algolia Search Request / Response (InstantSearch.js contract) ────────

/** A single search request from InstantSearch.js widgets. */
export interface AlgoliaSearchRequest {
	readonly indexName: string;
	readonly params?: AlgoliaSearchParams;
}

/** Algolia search parameters the adapter must translate. */
export interface AlgoliaSearchParams {
	readonly query?: string;
	readonly hitsPerPage?: number;
	readonly page?: number;
	readonly facetFilters?: ReadonlyArray<string | string[]>;
	readonly numericFilters?: readonly string[];
	readonly facets?: readonly string[];
	readonly attributesToHighlight?: readonly string[];
	readonly highlightPreTag?: string;
	readonly highlightPostTag?: string;
	readonly attributesToSnippet?: readonly string[];
	readonly snippetEllipsisText?: string;
	readonly analytics?: boolean;
	readonly enableRules?: boolean;
	readonly aroundLatLng?: string;
	readonly aroundRadius?: number | "all";
	readonly aroundPrecision?: number;
	readonly insideBoundingBox?: string;
	readonly insidePolygon?: string[];
	readonly tagFilters?: ReadonlyArray<string | string[]>;
	readonly optionalFilters?: ReadonlyArray<string | string[]>;
	readonly sumOrFiltersScores?: boolean;
	readonly filters?: string;
	readonly clickAnalytics?: boolean;
	readonly ruleContexts?: readonly string[];
	readonly enablePersonalization?: boolean;
	readonly userToken?: string;
	readonly getRankingInfo?: boolean;

	/** Any other Algolia params the user might pass. */
	readonly [key: string]: unknown;
}

/** Algolia-formatted search hit returned by the adapter. */
export interface AlgoliaHit {
	/** Unique object ID (maps from document ID or first unique field). */
	readonly objectID: string;
	/** Highlighted fields, if requested. */
	readonly _highlightResult?: Record<string, AlgoliaHighlightResult>;
	/** Snippeted fields, if requested. */
	readonly _snippetResult?: Record<string, AlgoliaSnippetResult>;
	/** Ranking info, if getRankingInfo=true. */
	readonly _rankingInfo?: AlgoliaRankingInfo;
	/** Document fields are spread directly on the hit. */
	readonly [key: string]: unknown;
}

export interface AlgoliaHighlightResult {
	readonly value: string;
	readonly matchLevel: "none" | "partial" | "full";
	readonly matchedWords: readonly string[];
	readonly fullyHighlighted?: boolean;
}

export interface AlgoliaSnippetResult {
	readonly value: string;
	readonly matchLevel: "none" | "partial" | "full";
}

export interface AlgoliaRankingInfo {
	readonly nbTypos: number;
	readonly firstMatchedWord: number;
	readonly proximityDistance?: number;
	readonly userScore: number;
	readonly geoDistance: number;
	readonly geoPrecision?: number;
	readonly nbExactWords: number;
	readonly words: number;
	readonly filters: number;
}

/** A single search response translated back to Algolia format. */
export interface AlgoliaSearchResponse {
	readonly hits: readonly AlgoliaHit[];
	readonly nbHits: number;
	readonly page: number;
	readonly nbPages: number;
	readonly hitsPerPage: number;
	readonly processingTimeMS: number;
	readonly query: string;
	readonly params: string;
	readonly index: string;
	readonly facets?: Record<string, Record<string, number>>;
	readonly facet_stats?: Record<string, AlgoliaFacetStats>;
	readonly exhaustiveFacetsCount?: boolean;
	readonly exhaustiveNbHits?: boolean;
	readonly renderingContent?: Record<string, unknown>;
}

export interface AlgoliaFacetStats {
	readonly min: number;
	readonly max: number;
	readonly avg: number;
	readonly sum: number;
}

/** Facet search request for refinement lists. */
export interface AlgoliaFacetSearchRequest {
	readonly indexName: string;
	readonly params: {
		readonly facetName: string;
		readonly facetQuery?: string;
		readonly query?: string;
		readonly maxFacetHits?: number;
	};
}

/** Facet search response entry. */
export interface AlgoliaFacetHit {
	readonly value: string;
	readonly highlighted: string;
	readonly count: number;
}

export interface AlgoliaFacetSearchResponse {
	readonly facetHits: readonly AlgoliaFacetHit[];
	readonly processingTimeMS: number;
	readonly query?: string;
}

// ─── InstantSearch.js searchClient interface ──────────────────────────────

/**
 * The minimal search client contract InstantSearch.js requires.
 *
 * Reference:
 * https://www.algolia.com/doc/guides/building-search-ui/going-further/backend-search/in-depth/backend-connector/
 */
export interface SearchClient {
	/**
	 * Search one or more indices in a single request.
	 * InstantSearch calls this with an array of queries.
	 */
	readonly search: (
		requests: readonly AlgoliaSearchRequest[],
	) => Promise<readonly AlgoliaSearchResponse[]>;

	/**
	 * Search for facet values (used by RefinementList to populate facet options).
	 */
	readonly searchForFacetValues: (
		requests: readonly AlgoliaFacetSearchRequest[],
	) => Promise<readonly AlgoliaFacetSearchResponse[]>;
}

// ─── Adapter Configuration ─────────────────────────────────────────────────

/** AACsearch server connection details. */
export interface AACsearchServerConfig {
	/** Search-only or scoped API key. */
	readonly apiKey: string;
	/** One or more AACsearch nodes to connect to. */
	readonly nodes: readonly AACsearchNode[];
}

/** A single AACsearch node. */
export interface AACsearchNode {
	/** Hostname (e.g. "app.aacsearch.com" or "localhost"). */
	readonly host: string;
	/** Port (default: 443 for https, 80 for http). */
	readonly port?: number;
	/** Protocol (default: "https"). */
	readonly protocol?: string;
}

/** Adapter configuration options. */
export interface InstantSearchAdapterOptions {
	/** AACsearch server and authentication configuration. */
	readonly server: AACsearchServerConfig;

	/**
	 * Extra search parameters sent with every request.
	 * Use this to set default `query_by`, `sort_by`, etc.
	 *
	 * @example { query_by: "title,description", sort_by: "_text_match:desc" }
	 */
	readonly additionalSearchParameters?: Record<string, unknown>;

	/**
	 * Per-index overrides for `additionalSearchParameters`.
	 * The key is the index name; the value is merged over the base params.
	 *
	 * @example { products: { query_by: "name,sku,description" } }
	 */
	readonly collectionSpecificSearchParameters?: Record<string, Record<string, unknown>>;

	/**
	 * How long (in seconds) to cache search results client-side.
	 * Set to 0 to disable caching. Default: 120.
	 */
	readonly cacheSearchResultsForSeconds?: number;
}

// ─── Cache ─────────────────────────────────────────────────────────────────

/** Internal cache entry with TTL. */
export interface CacheEntry<T> {
	readonly value: T;
	readuntil: number;
}
