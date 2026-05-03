import "server-only";
import { config } from "../config";
import { getTypesenseClient } from "./client";

export interface GeoPolygonFilter {
	/** Geolocation field name (default: "_geoloc") */
	field?: string;
	/** Polygon vertices as [lat, lng] pairs */
	polygon: Array<[number, number]>;
}

export interface GeoBoundingBoxFilter {
	/** Geolocation field name (default: "_geoloc") */
	field?: string;
	/** Bounding box defined by top-left and bottom-right corners */
	bounding_box: [{ lat: number; lng: number }, { lat: number; lng: number }];
}

export interface GeoMultiLocationFilter {
	/** Geolocation field name (default: "_geoloc") */
	field?: string;
	/** Array of center points with individual radius in km */
	locations: Array<{ lat: number; lng: number; radiusKm: number }>;
}

interface TypesenseSearchParams {
	q: string;
	query_by: string;
	filter_by?: string;
	facet_by?: string;
	sort_by?: string;
	per_page?: number;
	page?: number;
	highlight_fields?: string;
	vector_query?: string;
}

export interface FacetCount {
	field_name: string;
	counts: Array<{ value: string; count: number }>;
	stats?: {
		min?: number;
		max?: number;
		avg?: number;
		sum?: number;
	} | null;
}

export type FacetStrategy = "exact" | "intersection";

export interface SearchDocumentsInput {
	alias: string;
	tenantId: string;
	q: string;
	queryBy?: string;
	filterBy?: string;
	facetBy?: string;
	sortBy?: string;
	perPage?: number;
	page?: number;
	highlightFields?: string;
	/** Per-search HNSW ef parameter — controls recall quality for vector search (higher = better recall, slower). */
	vectorQueryEf?: number;
	/** Vector query string in Typesense format, e.g. "vec:([0.1, 0.2, ...], k:10)". */
	vectorQuery?: string;
	/** Aggressiveness of adaptive facet sampling (0–1). Lower = more aggressive sampling. */
	facetSampleSlope?: number;
	/** Minimum number of documents before adaptive facet sampling kicks in. */
	facetSampleThreshold?: number;
	/** Advanced facet params (Typesense v0.30+) —────────────────────── */
	/** Maximum number of facet values to return per field. */
	maxFacetValues?: number;
	/** Filter facet values by a sub-query (autocomplete within facet values). */
	facetQuery?: string;
	/** Search across facet values (typeahead within facet values). */
	facetSearch?: string;
	/** Percentage of documents to sample for facet counts (0–100). */
	facetSamplePercent?: number;
	/** Facet strategy: "exact" for exact matches, "intersection" for intersection-based counting. */
	facetStrategy?: FacetStrategy;
	/** Per-field facet value sort order (comma-separated). Format: "field_name:count|alpha". E.g. "category:count,brand:alpha". */
	facetSortBy?: string;
	// ── Typo fine-tuning (Typesense v0.30+) ─────────────────────────
	/** Exhaustive search: scan all matching documents for typo corrections (slower but more accurate). */
	exhaustiveSearch?: boolean;
	/** Whether synonym values also benefit from typo tolerance. */
	synonymPrefix?: boolean;
	/** Number of typos allowed for synonym values. */
	synonymNumTypos?: number;
	/** Minimum word length for 1-typo correction. */
	minLen1Typo?: number;
	/** Minimum word length for 2-typo correction. */
	minLen2Typo?: number;
	/** Token dropping strategy when no results match all tokens. */
	dropTokensMode?: "right_to_left" | "left_to_right" | `both_sides:${number}`;
	/** Maximum number of candidate corrections to consider. */
	maxCandidates?: number;
	/** Cache TTL in seconds — how long to cache this specific search query result. Only applies when `use_cache` is enabled on the collection. */
	cacheTtl?: number;
	/** Use the new highlight v2 response format (set to `false` to opt in). */
	enableHighlightV1?: boolean;
	/** Whether to group null/empty values as a separate group when using `group_by`. */
	groupMissingValues?: boolean;
}

export interface SearchDocumentsResult {
	hits: unknown[];
	found: number;
	page: number;
	perPage: number;
	facetCounts: FacetCount[];
	searchTimeMs: number;
	/** query_id from Typesense for analytics event association */
	queryId?: string;
}

function combineTenantFilter(tenantId: string, userFilter?: string): string {
	const tenant = `${config.tenantField}:=${tenantId}`;
	if (!userFilter) {
		return tenant;
	}
	return `${tenant} && (${userFilter})`;
}

function buildMultiLocationFilter(filter: GeoMultiLocationFilter): string {
	const field = filter.field ?? "_geoloc";
	return filter.locations
		.map((loc) => `${field}:(${loc.lat}, ${loc.lng}, ${loc.radiusKm} km)`)
		.join(" || ");
}

export async function searchDocuments(input: SearchDocumentsInput): Promise<SearchDocumentsResult> {
	const client = getTypesenseClient();

	const perPage = Math.min(
		Math.max(input.perPage ?? config.defaultPerPage, 1),
		config.maxPerPage,
	);

	let vectorQuery = input.vectorQuery;
	if (vectorQuery !== undefined && input.vectorQueryEf !== undefined) {
		// Append ef parameter to the vector query string, e.g. "vec:([...], k:10, ef:200)"
		vectorQuery = vectorQuery.replace(/\)$/, `, ef:${input.vectorQueryEf})`);
	}

	const params: TypesenseSearchParams = {
		q: input.q,
		query_by: input.queryBy ?? "",
		filter_by: combineTenantFilter(input.tenantId, input.filterBy),
		facet_by: input.facetBy,
		sort_by: input.sortBy,
		per_page: perPage,
		page: input.page ?? 1,
		highlight_fields: input.highlightFields,
		vector_query: vectorQuery,
	};

	const response = await client
		.collections(input.alias)
		.documents()
		.search({
			...params,
			...(input.facetSampleSlope !== undefined && {
				facet_sample_slope: input.facetSampleSlope,
			}),
			...(input.facetSampleThreshold !== undefined && {
				facet_sample_threshold: input.facetSampleThreshold,
			}),
			// ── Advanced facet params ──
			...(input.maxFacetValues !== undefined && {
				max_facet_values: input.maxFacetValues,
			}),
			...(input.facetQuery !== undefined && {
				facet_query: input.facetQuery,
			}),
			...(input.facetSearch !== undefined && {
				facet_search: input.facetSearch,
			}),
			...(input.facetSamplePercent !== undefined && {
				facet_sample_percent: input.facetSamplePercent,
			}),
			...(input.facetStrategy !== undefined && {
				facet_strategy: input.facetStrategy,
			}),
			...(input.facetSortBy !== undefined && {
				facet_sort_by: input.facetSortBy,
			}),
			// ── Typo fine-tuning ──
			...(input.exhaustiveSearch !== undefined && {
				exhaustive_search: input.exhaustiveSearch,
			}),
			...(input.synonymPrefix !== undefined && {
				synonym_prefix: input.synonymPrefix,
			}),
			...(input.synonymNumTypos !== undefined && {
				synonym_num_typos: input.synonymNumTypos,
			}),
			...(input.minLen1Typo !== undefined && {
				min_len_1typo: input.minLen1Typo,
			}),
			...(input.minLen2Typo !== undefined && {
				min_len_2typo: input.minLen2Typo,
			}),
			...(input.dropTokensMode !== undefined && {
				drop_tokens_mode: input.dropTokensMode,
			}),
			...(input.maxCandidates !== undefined && {
				max_candidates: input.maxCandidates,
			}),
			// ── Caching ──
			...(input.cacheTtl !== undefined && {
				cache_ttl: input.cacheTtl,
			}),
			// ── Highlight ──
			...(input.enableHighlightV1 !== undefined && {
				enable_highlight_v1: input.enableHighlightV1,
			}),
			// ── Grouping ──
			...(input.groupMissingValues !== undefined && {
				group_missing_values: input.groupMissingValues,
			}),
		} as any);

	return {
		hits: response.hits ?? [],
		found: response.found ?? 0,
		page: response.page ?? 1,
		perPage,
		facetCounts: response.facet_counts ?? [],
		searchTimeMs: response.search_time_ms ?? 0,
		queryId: (response as unknown as Record<string, unknown>).query_id as string | undefined,
	};
}

export interface MultiSearchEntry extends Omit<SearchDocumentsInput, "alias"> {
	alias: string;
}

/**
 * Federated/union search across multiple aliases in a single Typesense round-trip.
 * Each entry is tenant-filter-combined the same way as `searchDocuments`.
 */
export async function multiSearchDocuments(
	entries: MultiSearchEntry[],
): Promise<SearchDocumentsResult[]> {
	if (entries.length === 0) return [];
	const client = getTypesenseClient();

	const searches = entries.map((entry) => {
		const perPage = Math.min(
			Math.max(entry.perPage ?? config.defaultPerPage, 1),
			config.maxPerPage,
		);
		let vectorQuery = entry.vectorQuery;
		if (vectorQuery !== undefined && entry.vectorQueryEf !== undefined) {
			vectorQuery = vectorQuery.replace(/\)$/, `, ef:${entry.vectorQueryEf})`);
		}
		return {
			collection: entry.alias,
			q: entry.q,
			query_by: entry.queryBy ?? "",
			filter_by: combineTenantFilter(entry.tenantId, entry.filterBy),
			facet_by: entry.facetBy,
			sort_by: entry.sortBy,
			per_page: perPage,
			page: entry.page ?? 1,
			highlight_fields: entry.highlightFields,
			vector_query: vectorQuery,
			...(entry.facetSampleSlope !== undefined && {
				facet_sample_slope: entry.facetSampleSlope,
			}),
			...(entry.facetSampleThreshold !== undefined && {
				facet_sample_threshold: entry.facetSampleThreshold,
			}),
			// ── Advanced facet params ──
			...(entry.maxFacetValues !== undefined && {
				max_facet_values: entry.maxFacetValues,
			}),
			...(entry.facetQuery !== undefined && {
				facet_query: entry.facetQuery,
			}),
			...(entry.facetSearch !== undefined && {
				facet_search: entry.facetSearch,
			}),
			...(entry.facetSamplePercent !== undefined && {
				facet_sample_percent: entry.facetSamplePercent,
			}),
			...(entry.facetStrategy !== undefined && {
				facet_strategy: entry.facetStrategy,
			}),
			...(entry.facetSortBy !== undefined && {
				facet_sort_by: entry.facetSortBy,
			}),
			// ── Typo fine-tuning ──
			...(entry.exhaustiveSearch !== undefined && {
				exhaustive_search: entry.exhaustiveSearch,
			}),
			...(entry.synonymPrefix !== undefined && {
				synonym_prefix: entry.synonymPrefix,
			}),
			...(entry.synonymNumTypos !== undefined && {
				synonym_num_typos: entry.synonymNumTypos,
			}),
			...(entry.minLen1Typo !== undefined && {
				min_len_1typo: entry.minLen1Typo,
			}),
			...(entry.minLen2Typo !== undefined && {
				min_len_2typo: entry.minLen2Typo,
			}),
			...(entry.dropTokensMode !== undefined && {
				drop_tokens_mode: entry.dropTokensMode,
			}),
			...(entry.maxCandidates !== undefined && {
				max_candidates: entry.maxCandidates,
			}),
			// ── Caching ──
			...(entry.cacheTtl !== undefined && {
				cache_ttl: entry.cacheTtl,
			}),
			// ── Highlight ──
			...(entry.enableHighlightV1 !== undefined && {
				enable_highlight_v1: entry.enableHighlightV1,
			}),
			// ── Grouping ──
			...(entry.groupMissingValues !== undefined && {
				group_missing_values: entry.groupMissingValues,
			}),
		};
	});

	const response = await client.multiSearch.perform({ searches: searches as any });
	const results =
		(response as unknown as { results: Array<Record<string, unknown>> }).results ?? [];

	return results.map((r, idx) => ({
		hits: (r.hits as unknown[]) ?? [],
		found: (r.found as number) ?? 0,
		page: (r.page as number) ?? 1,
		perPage: searches[idx].per_page,
		facetCounts: (r.facet_counts as FacetCount[]) ?? [],
		searchTimeMs: (r.search_time_ms as number) ?? 0,
	}));
}
