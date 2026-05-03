/**
 * InstantSearch-compatible search client that talks to AACsearch public API.
 *
 * Conforms to the InstantSearch `search` method contract:
 *   search(requests: SearchRequest[]): Promise<{results: SearchResponse[]}>
 *
 * Uses the ss_search_* or ss_scoped_* API key via Bearer auth.
 * Never exposes admin/write keys to the browser.
 */

export interface WidgetConfig {
	/** AACsearch API base URL, e.g. https://app.aacsearch.com */
	baseUrl: string;
	/** Search-only API key (ss_search_…) or scoped token (ss_scoped_…) */
	apiKey: string;
	/** Public index slug */
	indexSlug: string;
}

interface SearchResponse {
	hits: unknown[];
	nbHits: number;
	page: number;
	nbPages: number;
	hitsPerPage: number;
	processingTimeMS: number;
	facets?: Record<string, Record<string, number>>;
	exhaustiveFacetsCount: boolean;
	query: string;
	index: string;
	queryId: string | null;
}

export interface AiAnswerResult {
	answer: string;
	sources: Array<{
		id?: unknown;
		title?: string;
		url?: string;
		imageUrl?: string;
		price?: unknown;
	}>;
	found: number;
	searchTimeMs: number;
}

export interface ImageSearchHit {
	id?: unknown;
	title?: string;
	imageUrl?: string;
	price?: unknown;
	brand?: string;
	url?: string;
	vectorDistance?: number;
}

export interface ImageSearchResult {
	caption: string;
	hits: ImageSearchHit[];
	found: number;
	searchTimeMs: number;
}

/**
 * Creates an InstantSearch-compatible search client for the AACsearch public API.
 */
export function createAacSearchClient(config: WidgetConfig) {
	const baseUrl = config.baseUrl.replace(/\/+$/, "");

	return {
		search(requests: Array<{ indexName: string; params: Record<string, unknown> }>): Promise<{
			results: SearchResponse[];
		}> {
			// Map InstantSearch requests to our public handler format
			const searches = requests.map((req) => {
				const params = req.params as Record<string, unknown>;
				return {
					q: (params.query as string) ?? "*",
					queryBy: params.queryBy as string | undefined,
					filterBy: params.filterBy as string | undefined,
					facetBy: params.facets as string | undefined,
					sortBy: params.sortBy as string | undefined,
					perPage: (params.hitsPerPage as number) ?? 20,
					page: ((params.page as number) ?? 1) + 1, // InstantSearch is 0-based, Typesense is 1-based
					highlightFields: params.highlightFields as string | undefined,
					disjunctiveFacets: params.disjunctiveFacets as string | undefined,
					maxFacetValues: params.maxFacetValues as number | undefined,
					hierarchicalFacets: params.hierarchicalFacets as string | undefined,
					facetSearch: params.facetSearch as string | undefined,
					facetSamplePercent: params.facetSamplePercent as number | undefined,
					facetSortBy: params.facetSortBy as string | undefined,
					facetStrategy: params.facetStrategy as string | undefined,
					rangeFacets: params.rangeFacets as
						| Array<{
								field: string;
								min: number | string;
								max: number | string;
						  }>
						| undefined,
				};
			});

			return fetch(`${baseUrl}/api/search/public/multi`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${config.apiKey}`,
				},
				body: JSON.stringify({ searches }),
			}).then(async (response) => {
				if (!response.ok) {
					const body = await response.text().catch(() => "");
					throw new Error(
						`AACsearch search failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
					);
				}

				const data: {
					results: Array<{
						hits: unknown[];
						found: number;
						page: number;
						perPage: number;
						facetCounts: Array<{
							field_name: string;
							counts: Array<{ value: string; count: number }>;
						}>;
						searchTimeMs: number;
						queryId: string | null;
					}>;
				} = await response.json();

				// Map back to InstantSearch format
				const results: SearchResponse[] = data.results.map((r) => ({
					hits: r.hits.map((hit) => {
						const doc = (hit as { document?: Record<string, unknown> }).document ?? {};
						return {
							...doc,
							objectID: (doc.id as string) ?? "",
							_highlightResult: (hit as { highlights?: unknown }).highlights,
						};
					}),
					nbHits: r.found,
					page: Math.max(0, r.page - 1),
					nbPages: Math.ceil(r.found / r.perPage),
					hitsPerPage: r.perPage,
					processingTimeMS: r.searchTimeMs,
					queryId: r.queryId,
					facets: r.facetCounts?.reduce(
						(acc, fc) => {
							acc[fc.field_name] = fc.counts.reduce(
								(fAcc: Record<string, number>, fv) => {
									fAcc[fv.value] = fv.count;
									return fAcc;
								},
								{} as Record<string, number>,
							);
							return acc;
						},
						{} as Record<string, Record<string, number>>,
					),
					exhaustiveFacetsCount: true,
					query: (requests[0]?.params?.query as string) ?? "",
					index: requests[0]?.indexName ?? config.indexSlug,
				}));

				return { results };
			});
		},

		/**
		 * Get autocomplete suggestions for a search prefix.
		 * Calls POST /v1/indexes/:slug/suggest
		 *
		 * @param q - The search query prefix
		 * @param options - Optional settings (limit, fuzzy, etc.)
		 * @returns Suggestions grouped by source (popular, trending, prefix, etc.)
		 */
		getSuggestions(
			q: string,
			options?: {
				limit?: number;
				fuzzy?: boolean;
				fuzzyDistance?: number;
				minPrefix?: number;
				popular?: boolean;
				trending?: boolean;
				recent?: boolean;
				anonymousUserId?: string;
				sessionId?: string;
			},
		): Promise<{
			suggestions: Array<{
				text: string;
				score: number;
				source: string;
				type: string;
				highlights?: Array<{ start: number; end: number }>;
			}>;
			groups: Array<{
				name: string;
				label: string;
				suggestions: Array<{
					text: string;
					score: number;
					source: string;
					type: string;
					highlights?: Array<{ start: number; end: number }>;
				}>;
			}>;
			total: number;
		}> {
			return fetch(
				`${baseUrl}/api/v1/indexes/${encodeURIComponent(config.indexSlug)}/suggest`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${config.apiKey}`,
					},
					body: JSON.stringify({ q, ...options }),
				},
			).then(async (response) => {
				if (!response.ok) {
					const body = await response.text().catch(() => "");
					throw new Error(
						`AACsearch suggest failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
					);
				}
				return response.json();
			});
		},

		/**
		 * Zero-click AI Answer — searches the index and generates a concise answer via LLM.
		 * Gracefully returns empty answer when AI is unavailable.
		 *
		 * Calls POST /api/search/ai/answer
		 */
		getAiAnswer(
			query: string,
			options?: {
				indexSlug?: string;
				queryBy?: string;
				filterBy?: string;
				perPage?: number;
			},
		): Promise<AiAnswerResult> {
			return fetch(`${baseUrl}/api/search/ai/answer`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${config.apiKey}`,
				},
				body: JSON.stringify({
					query,
					indexSlug: options?.indexSlug ?? config.indexSlug,
					queryBy: options?.queryBy,
					filterBy: options?.filterBy,
					perPage: options?.perPage,
				}),
			})
				.then(async (response) => {
					if (!response.ok) return { answer: "", sources: [], found: 0, searchTimeMs: 0 };
					return response.json() as Promise<AiAnswerResult>;
				})
				.catch(() => ({ answer: "", sources: [], found: 0, searchTimeMs: 0 }));
		},

		/**
		 * Visual / image search — upload a file and find visually similar products.
		 *
		 * Accepts either a File/Blob (converted to base64) or an image URL string.
		 * Calls POST /api/search/ai/image
		 */
		async searchByImage(
			image: File | Blob | string,
			options?: {
				indexSlug?: string;
				field?: string;
				k?: number;
				filterBy?: string;
			},
		): Promise<ImageSearchResult> {
			let imageUrl: string | undefined;
			let imageBase64: string | undefined;

			if (typeof image === "string") {
				imageUrl = image;
			} else {
				const buffer = await image.arrayBuffer();
				const bytes = new Uint8Array(buffer);
				let binary = "";
				bytes.forEach((b) => (binary += String.fromCharCode(b)));
				imageBase64 = btoa(binary);
			}

			return fetch(`${baseUrl}/api/search/ai/image`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${config.apiKey}`,
				},
				body: JSON.stringify({
					imageUrl,
					imageBase64,
					indexSlug: options?.indexSlug ?? config.indexSlug,
					field: options?.field,
					k: options?.k,
					filterBy: options?.filterBy,
				}),
			})
				.then(async (response) => {
					if (!response.ok) return { caption: "", hits: [], found: 0, searchTimeMs: 0 };
					return response.json() as Promise<ImageSearchResult>;
				})
				.catch(() => ({ caption: "", hits: [], found: 0, searchTimeMs: 0 }));
		},
	};
}

// Re-export type for consumers
export type { SearchResponse };
