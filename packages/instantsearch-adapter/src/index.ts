/**
 * @aacsearch/instantsearch-adapter — AACsearch InstantSearch.js Adapter
 *
 * Drop-in replacement for the Algolia search client that works with
 * instantsearch.js, react-instantsearch, vue-instantsearch, and
 * angular-instantsearch.
 *
 * @example
 * ```typescript
 * import instantsearch from 'instantsearch.js';
 * import { searchBox, hits, pagination } from 'instantsearch.js/es/widgets';
 * import { AacSearchInstantSearchAdapter } from '@aacsearch/instantsearch-adapter';
 *
 * const searchClient = new AacSearchInstantSearchAdapter({
 *   server: {
 *     apiKey: 'ss_search_****',
 *     nodes: [{ host: 'app.aacsearch.com' }],
 *   },
 *   additionalSearchParameters: {
 *     query_by: 'title,description',
 *   },
 * });
 *
 * const search = instantsearch({
 *   searchClient,
 *   indexName: 'products',
 * });
 *
 * search.addWidgets([
 *   searchBox({ container: '#searchbox' }),
 *   hits({ container: '#hits' }),
 *   pagination({ container: '#pagination' }),
 * ]);
 *
 * search.start();
 * ```
 *
 * @module @aacsearch/instantsearch-adapter
 */

import { TtlCache } from "./cache";
import { mapQuery } from "./query-mapper";
import type { AACsearchParams } from "./query-mapper";
import {
	mapResponse,
	mapFacetSearchResponse,
	buildBaseUrl,
	performSearch,
} from "./response-mapper";
import type { AACsearchSearchResponse } from "./response-mapper";
import type {
	AlgoliaSearchRequest,
	AlgoliaSearchResponse,
	AlgoliaFacetSearchRequest,
	AlgoliaFacetSearchResponse,
	SearchClient,
	InstantSearchAdapterOptions,
	AACsearchServerConfig,
} from "./types";

/**
 * Partial search response type cached between requests.
 * We store the response per search request so multi-search results
 * can be reused for subsequent facets searches on the same query.
 */
interface CachedSearchResult {
	readonly indexName: string;
	readonly query: string;
	readonly response: AlgoliaSearchResponse;
}

/**
 * AACsearch InstantSearch.js adapter class.
 *
 * Implements the `SearchClient` interface required by InstantSearch.js.
 * Create an instance and pass it to the InstantSearch `searchClient` option.
 */
export class AacSearchInstantSearchAdapter implements SearchClient {
	private readonly serverConfig: AACsearchServerConfig;
	private readonly additionalParams: Record<string, unknown>;
	private readonly collectionParams: Record<string, Record<string, unknown>>;
	private readonly baseUrl: string;
	private readonly cache: TtlCache<readonly AlgoliaSearchResponse[]>;

	/**
	 * @param opts - Adapter configuration options.
	 */
	constructor(opts: InstantSearchAdapterOptions) {
		this.serverConfig = opts.server;
		this.additionalParams = opts.additionalSearchParameters ?? {};
		this.collectionParams = opts.collectionSpecificSearchParameters ?? {};
		this.baseUrl = buildBaseUrl(opts.server);

		const ttl = opts.cacheSearchResultsForSeconds ?? 120;
		this.cache = new TtlCache<readonly AlgoliaSearchResponse[]>(ttl);
	}

	// ─── SearchClient Interface ───────────────────────────────────────────

	/**
	 * Search one or more indices.
	 *
	 * InstantSearch calls this method with an array of search requests.
	 * We translate each to an AACsearch call and map responses back.
	 *
	 * @param requests - Array of Algolia search requests.
	 * @returns Array of Algolia-formatted search responses.
	 */
	async search(
		requests: readonly AlgoliaSearchRequest[],
	): Promise<readonly AlgoliaSearchResponse[]> {
		if (requests.length === 0) {
			return [];
		}

		// Build cache key from requests
		const cacheKey = this.buildCacheKey(requests);

		// Check cache first
		const cached = this.cache.get(cacheKey);
		if (cached) {
			return cached;
		}

		// Map each request to AACsearch params
		const mappedRequests = requests.map((req) => {
			return mapQuery(req, this.additionalParams, this.collectionParams);
		});

		let responses: AlgoliaSearchResponse[];

		if (mappedRequests.length === 1) {
			// Single request — direct search
			const { indexSlug, params } = mappedRequests[0];
			const aacResponse = await this.executeSearch(indexSlug, params);
			const request = requests[0];
			responses = [mapResponse(aacResponse, indexSlug, request.params?.query ?? "", params)];
		} else {
			// Multiple requests — use multi-search
			responses = await this.executeMultiSearch(requests, mappedRequests);
		}

		// Cache the results
		this.cache.set(cacheKey, responses);

		return responses;
	}

	/**
	 * Search for facet values (used by RefinementList widgets).
	 *
	 * We perform a normal search with the parent query and filter the
	 * facet counts from the response.
	 *
	 * @param requests - Array of facet search requests.
	 * @returns Array of facet search responses.
	 */
	async searchForFacetValues(
		requests: readonly AlgoliaFacetSearchRequest[],
	): Promise<readonly AlgoliaFacetSearchResponse[]> {
		if (requests.length === 0) {
			return [];
		}

		return Promise.all(
			requests.map(async (req) => {
				const { indexName, params } = req;
				const { facetName, facetQuery, query, maxFacetHits } = params;

				// Build a search request that includes only the requested facet
				const searchRequest: AlgoliaSearchRequest = {
					indexName,
					params: {
						query: query ?? "",
						facets: [facetName],
						hitsPerPage: 0, // We only need facet counts, not hits
					},
				};

				// Apply maxFacetHits — AACsearch calls this max_facet_values
				const mapped = mapQuery(
					searchRequest,
					this.additionalParams,
					this.collectionParams,
				);
				if (maxFacetHits) {
					(mapped.params as Record<string, unknown>).max_facet_values = maxFacetHits;
				}

				const aacResponse = await this.executeSearch(indexName, mapped.params);
				const algoliaResponse = mapResponse(
					aacResponse,
					indexName,
					query ?? "",
					mapped.params,
				);

				return mapFacetSearchResponse(facetName, facetQuery, algoliaResponse);
			}),
		);
	}

	// ─── Private Helpers ───────────────────────────────────────────────────

	/**
	 * Execute a single search against AACsearch.
	 */
	private async executeSearch(
		indexSlug: string,
		params: AACsearchParams,
	): ReturnType<typeof performSearch> {
		return performSearch(this.baseUrl, this.serverConfig.apiKey, indexSlug, params);
	}

	/**
	 * Execute multiple searches, using multi-search for efficiency.
	 */
	private async executeMultiSearch(
		requests: readonly AlgoliaSearchRequest[],
		mapped: Array<{ indexSlug: string; params: AACsearchParams }>,
	): Promise<AlgoliaSearchResponse[]> {
		const doFetch: typeof fetch = fetch;
		const url = `${this.baseUrl.replace(/\/+$/, "")}/api/v1/multi-search`;

		const searches = mapped.map((m) => ({
			index: m.indexSlug,
			...m.params,
		}));

		const response = await doFetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.serverConfig.apiKey}`,
			},
			body: JSON.stringify({ searches }),
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(
				`AACsearch multi-search failed: ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`,
			);
		}

		const data = (await response.json()) as {
			results?: ReadonlyArray<AACsearchSearchResponse>;
		};
		const aacResults = data.results ?? [];

		return aacResults.map((result, i) => {
			const request = requests[i];
			const mappedReq = mapped[i];
			return mapResponse(
				result,
				mappedReq.indexSlug,
				request.params?.query ?? "",
				mappedReq.params,
			);
		});
	}

	/**
	 * Build a deterministic cache key from an array of search requests.
	 */
	private buildCacheKey(requests: readonly AlgoliaSearchRequest[]): string {
		return JSON.stringify(requests);
	}

	/**
	 * Clear the internal search results cache.
	 * Useful for testing or when you want fresh results.
	 */
	clearCache(): void {
		this.cache.clear();
	}
}

// ─── Re-exports for convenience ────────────────────────────────────────────

export type {
	InstantSearchAdapterOptions,
	AACsearchServerConfig,
	AlgoliaSearchRequest,
	AlgoliaSearchResponse,
	AlgoliaSearchParams,
	AlgoliaHit,
	AlgoliaFacetSearchRequest,
	AlgoliaFacetSearchResponse,
	SearchClient,
} from "./types";
