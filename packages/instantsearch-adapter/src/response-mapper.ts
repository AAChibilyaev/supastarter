/**
 * Response mapper — translates AACsearch search responses into
 * Algolia InstantSearch-compatible response format.
 *
 * @see https://typesense.org/docs/26.0/api/search.html#response
 * @module @aacsearch/instantsearch-adapter
 */

import type { AACsearchParams } from "./query-mapper";
import type {
	AlgoliaHit,
	AlgoliaHighlightResult,
	AlgoliaSearchResponse,
	AlgoliaFacetHit,
	AlgoliaFacetSearchResponse,
	AlgoliaFacetStats,
	AACsearchServerConfig,
} from "./types";

// ─── AACsearch Response Types (minimal) ────────────────────────────────────

/** Shape of a single AACsearch search hit. */
interface AACsearchHit {
	readonly document: Record<string, unknown>;
	readonly highlights?: ReadonlyArray<{
		readonly field: string;
		readonly snippet?: string;
		readonly value?: string;
		readonly matched_tokens?: readonly string[];
		readonly indices?: readonly number[];
	}>;
	readonly text_match?: number;
	readonly text_match_info?: {
		readonly best_field_score: string;
		readonly best_field_weight: number;
		readonly fields_matched: number;
		readonly score: string;
		readonly tokens_matched: number;
	};
	readonly geo_distance_meters?: Record<string, number>;
}

/** Shape of the AACsearch search response. */
export interface AACsearchSearchResponse {
	readonly hits?: readonly AACsearchHit[];
	readonly found?: number;
	readonly page?: number;
	readonly per_page?: number;
	readonly search_time_ms?: number;
	readonly facet_counts?: ReadonlyArray<{
		readonly field_name: string;
		readonly counts: ReadonlyArray<{
			readonly value: string;
			readonly count: number;
		}>;
	}>;
	readonly query_id?: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extract a stable objectID from an AACsearch document.
 * Prefers `id`, `objectID`, `uuid`, `_id`, then falls back to a hash of JSON.
 */
function extractObjectID(document: Record<string, unknown>): string {
	const candidates = ["id", "objectID", "uuid", "_id", "ID", "ObjectID"];
	for (const key of candidates) {
		const val = document[key];
		if (typeof val === "string" || typeof val === "number") {
			return String(val);
		}
	}
	// Fallback: simple hash of the document JSON
	const json = JSON.stringify(document);
	let hash = 0;
	for (let i = 0; i < json.length; i++) {
		const char = json.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0;
	}
	return `auto-${Math.abs(hash).toString(36)}`;
}

/**
 * Map AACsearch highlight snippets to Algolia _highlightResult.
 */
function mapHighlights(
	document: Record<string, unknown>,
	highlights: ReadonlyArray<{
		readonly field: string;
		readonly snippet?: string;
		readonly value?: string;
		readonly matched_tokens?: readonly string[];
	}>,
): Record<string, AlgoliaHighlightResult> | undefined {
	if (!highlights || highlights.length === 0) return undefined;

	const result: Record<string, AlgoliaHighlightResult> = {};

	for (const hl of highlights) {
		const fieldValue = hl.value ?? hl.snippet ?? "";
		const matchedWords = hl.matched_tokens ?? [];

		result[hl.field] = {
			value: fieldValue,
			matchLevel:
				matchedWords.length > 0 &&
				document[hl.field] !== undefined &&
				String(document[hl.field]).toLowerCase() === fieldValue.toLowerCase()
					? "full"
					: matchedWords.length > 0
						? "partial"
						: "none",
			matchedWords,
			fullyHighlighted:
				matchedWords.length > 0 &&
				document[hl.field] !== undefined &&
				String(document[hl.field]).toLowerCase() === fieldValue.toLowerCase()
					? true
					: undefined,
		};
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Map AACsearch facet_counts to Algolia facets format.
 */
function mapFacets(
	facetCounts: ReadonlyArray<{
		readonly field_name: string;
		readonly counts: ReadonlyArray<{ readonly value: string; readonly count: number }>;
	}>,
): Record<string, Record<string, number>> | undefined {
	if (!facetCounts || facetCounts.length === 0) return undefined;

	const result: Record<string, Record<string, number>> = {};

	for (const fc of facetCounts) {
		const counts: Record<string, number> = {};
		for (const c of fc.counts) {
			counts[c.value] = c.count;
		}
		result[fc.field_name] = counts;
	}

	return result;
}

/**
 * Compute Algolia facet_stats from AACsearch facet counts where possible.
 * AACsearch doesn't natively return min/max/avg/sum, so we compute from counts
 * if the values are numeric.
 */
function mapFacetStats(
	facetCounts: ReadonlyArray<{
		readonly field_name: string;
		readonly counts: ReadonlyArray<{ readonly value: string; readonly count: number }>;
	}>,
): Record<string, AlgoliaFacetStats> | undefined {
	if (!facetCounts || facetCounts.length === 0) return undefined;

	const result: Record<string, AlgoliaFacetStats> = {};

	for (const fc of facetCounts) {
		const numericValues: number[] = [];
		for (const c of fc.counts) {
			const num = Number(c.value);
			if (!Number.isNaN(num)) {
				numericValues.push(num);
			}
		}
		if (numericValues.length > 0) {
			const min = Math.min(...numericValues);
			const max = Math.max(...numericValues);
			const sum = numericValues.reduce((a, b) => a + b, 0);
			result[fc.field_name] = {
				min,
				max,
				avg: sum / numericValues.length,
				sum,
			};
		}
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

// ─── Main Mapper ───────────────────────────────────────────────────────────

/**
 * Map a single AACsearch response to an Algolia-formatted search response.
 */
export function mapResponse(
	aacResponse: AACsearchSearchResponse,
	indexName: string,
	query: string,
	aacParams: AACsearchParams,
): AlgoliaSearchResponse {
	const hits: AlgoliaHit[] = [];
	const aacHits = aacResponse.hits ?? [];

	for (const hit of aacHits) {
		const document = hit.document ?? {};

		const algoliaHit: AlgoliaHit = {
			objectID: extractObjectID(document),
			...document,
			_highlightResult: mapHighlights(document, hit.highlights ?? []),
		};

		// Include snippet results if snippet fields were requested
		if (aacParams.snippet_fields && hit.highlights) {
			const snippetResult: Record<string, AlgoliaHighlightResult> = {};
			for (const hl of hit.highlights) {
				if (hl.snippet) {
					snippetResult[hl.field] = {
						value: hl.snippet,
						matchLevel: (hl.matched_tokens?.length ?? 0) > 0 ? "partial" : "none",
						matchedWords: hl.matched_tokens ?? [],
					};
				}
			}
			if (Object.keys(snippetResult).length > 0) {
				(algoliaHit as Record<string, unknown>)._snippetResult = snippetResult;
			}
		}

		// Include ranking info
		if (hit.text_match_info) {
			(algoliaHit as Record<string, unknown>)._rankingInfo = {
				nbTypos: 0,
				firstMatchedWord: 0,
				proximityDistance: undefined,
				userScore: parseFloat(hit.text_match_info.score),
				geoDistance: 0,
				nbExactWords: hit.text_match_info.tokens_matched,
				words: hit.text_match_info.fields_matched,
				filters: 0,
			};
		}

		hits.push(algoliaHit);
	}

	const found = aacResponse.found ?? 0;
	const perPage = aacResponse.per_page ?? 20;
	const currentPage = aacResponse.page ?? 0;
	const nbPages = Math.max(1, Math.ceil(found / perPage));

	const facets = mapFacets(aacResponse.facet_counts ?? []);
	const facetStats = mapFacetStats(aacResponse.facet_counts ?? []);

	return {
		hits,
		nbHits: found,
		page: currentPage,
		nbPages,
		hitsPerPage: perPage,
		processingTimeMS: aacResponse.search_time_ms ?? 0,
		query,
		params: new URLSearchParams(
			Object.entries(aacParams).map(([k, v]) => [k, String(v)]),
		).toString(),
		index: indexName,
		...(facets ? { facets, exhaustiveFacetsCount: true } : {}),
		...(facetStats ? { facet_stats: facetStats } : {}),
	};
}

// ─── Facet Search Mapping ──────────────────────────────────────────────────

/**
 * Map facet search results from AACsearch.
 *
 * AACsearch doesn't have a native facet search endpoint like Algolia,
 * so we simulate it by filtering facet_counts from a regular search.
 */
export function mapFacetSearchResponse(
	facetName: string,
	facetQuery: string | undefined,
	searchResponse: AlgoliaSearchResponse,
): AlgoliaFacetSearchResponse {
	const facets = searchResponse.facets;
	const facetCounts = facets?.[facetName];
	const facetHits: AlgoliaFacetHit[] = [];

	if (facetCounts) {
		for (const [value, count] of Object.entries(facetCounts)) {
			// Filter by facetQuery if provided
			if (facetQuery && !value.toLowerCase().includes(facetQuery.toLowerCase())) {
				continue;
			}
			facetHits.push({
				value,
				highlighted: highlightFacetValue(value, facetQuery),
				count,
			});
		}
	}

	// Sort by count descending
	facetHits.sort((a, b) => b.count - a.count);

	return {
		facetHits,
		processingTimeMS: searchResponse.processingTimeMS,
		query: facetQuery,
	};
}

/**
 * Simple highlight of a facet value matching a query string.
 */
function highlightFacetValue(value: string, query?: string): string {
	if (!query) return value;
	const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`(${escaped})`, "gi");
	return value.replace(regex, "<em>$1</em>");
}

// ─── URL Construction ──────────────────────────────────────────────────────

/**
 * Build the base URL from server configuration.
 */
export function buildBaseUrl(config: AACsearchServerConfig): string {
	const node = config.nodes[0];
	if (!node) {
		throw new Error("AACsearch server configuration requires at least one node");
	}
	const protocol = node.protocol ?? "https";
	const port = node.port ?? (protocol === "https" ? 443 : 80);
	return `${protocol}://${node.host}${port !== 443 && port !== 80 ? `:${port}` : ""}`;
}

/**
 * Perform the HTTP search request to AACsearch.
 */
export async function performSearch(
	baseUrl: string,
	apiKey: string,
	indexSlug: string,
	params: AACsearchParams,
	fetchImpl?: typeof fetch,
): Promise<AACsearchSearchResponse> {
	const doFetch: typeof fetch = fetchImpl ?? fetch;
	const url = `${baseUrl.replace(/\/+$/, "")}/api/v1/indexes/${encodeURIComponent(indexSlug)}/search`;

	const response = await doFetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify(params),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`AACsearch search failed: ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`,
		);
	}

	return (await response.json()) as AACsearchSearchResponse;
}
