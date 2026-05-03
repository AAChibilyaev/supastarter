/**
 * @aacsearch/react — useAACsearch
 *
 * Perform search queries against an AACsearch index using TanStack Query
 * for caching, deduplication, and background refetching.
 *
 * @example
 * ```typescript
 * const { hits, nbHits, isLoading, error } = useAACsearch({
 *   baseUrl: 'https://app.aacsearch.com',
 *   apiKey: 'ss_search_****',
 *   indexId: 'products',
 *   q: 'red shoes',
 *   facetBy: 'brand,category',
 * });
 * ```
 *
 * @module @aacsearch/react
 */

import { V2SearchClient } from "@aacsearch/client";
import { useQuery } from "@tanstack/react-query";

// ─── Types ───────────────────────────────────────────────────────────────

/** A single search hit from AACsearch. */
export interface AACsearchHit {
	document: Record<string, unknown>;
	highlights?: Array<{ field: string; snippet: string }>;
}

/** Facet count for an attribute. */
export interface AACsearchFacetCount {
	fieldName: string;
	counts: Array<{ value: string; count: number }>;
}

/** Typed search result matching the AACsearch search API response. */
export interface AACsearchSearchResult {
	hits: AACsearchHit[];
	found: number;
	page: number;
	perPage: number;
	facetCounts?: AACsearchFacetCount[];
	searchTimeMs: number;
	queryId?: string | null;
}

// ─── Options ─────────────────────────────────────────────────────────────

/** Options for configuring and executing a search. */
export interface UseAACsearchOptions {
	/** AACsearch deployment origin (e.g. `https://app.aacsearch.com`). */
	readonly baseUrl: string;
	/** Search-scoped API key (`ss_search_*` or `ss_scoped_*`). */
	readonly apiKey: string;
	/** Public index slug or ID to search against. */
	readonly indexId: string;

	/** Search query text. */
	readonly q?: string;
	/** Filter expression (Typesense filter_by syntax). */
	readonly filters?: string;
	/** Comma-separated facet field names. */
	readonly facetBy?: string;
	/** Sort expression (e.g. `price:asc`). */
	readonly sortBy?: string;
	/** Results per page (default 20). */
	readonly perPage?: number;
	/** Page number (1-indexed, default 1). */
	readonly page?: number;
	/** Comma-separated fields to search in (query_by). */
	readonly queryBy?: string;

	/**
	 * Whether the query is enabled. Pass `false` to skip fetching
	 * (e.g. when there is no query text).
	 * @default true
	 */
	readonly enabled?: boolean;
	/**
	 * Stale time in milliseconds for TanStack Query.
	 * @default 30_000 (30 seconds)
	 */
	readonly staleTime?: number;
}

// ─── Hook ────────────────────────────────────────────────────────────────

/**
 * Perform a search query against an AACsearch index.
 *
 * Uses the v2 search API via `V2SearchClient` and TanStack Query for
 * automatic caching, deduplication, and background refetching.
 *
 * @param opts - Search configuration including credentials and query params.
 * @returns Search results with loading/error state.
 */
export function useAACsearch(opts: UseAACsearchOptions): {
	hits: AACsearchHit[];
	nbHits: number;
	facets: AACsearchFacetCount[] | undefined;
	isLoading: boolean;
	isFetching: boolean;
	error: Error | null;
	searchTimeMs: number;
	queryId: string | null | undefined;
	refetch: () => void;
} {
	const {
		baseUrl,
		apiKey,
		indexId,
		q,
		filters,
		facetBy,
		sortBy,
		perPage = 20,
		page = 1,
		queryBy,
		enabled = true,
		staleTime = 30_000,
	} = opts;

	const queryKey = [
		"aacsearch",
		indexId,
		q ?? "",
		filters ?? "",
		facetBy ?? "",
		sortBy ?? "",
		perPage,
		page,
		queryBy ?? "",
	] as const;

	const result = useQuery<AACsearchSearchResult, Error>({
		queryKey,
		queryFn: async () => {
			const client = new V2SearchClient({ baseUrl, apiKey, indexId });

			const response = await client.search({
				q: q ?? "",
				filterBy: filters,
				facetBy: facetBy,
				sortBy: sortBy,
				perPage,
				page,
				queryBy,
			});

			return response as AACsearchSearchResult;
		},
		enabled,
		staleTime,
	});

	return {
		hits: result.data?.hits ?? [],
		nbHits: result.data?.found ?? 0,
		facets: result.data?.facetCounts,
		isLoading: result.isLoading,
		isFetching: result.isFetching,
		error: result.error,
		searchTimeMs: result.data?.searchTimeMs ?? 0,
		queryId: result.data?.queryId,
		refetch: () => {
			void result.refetch();
		},
	};
}
