import "server-only";
import { config } from "../config";
import { getTypesenseClient } from "./client";
import { withSearchFailover } from "./routing";

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

/**
 * A single range facet definition for numeric or date fields.
 * Typesense syntax: field:range:(min..max)
 * Use `*` for open-ended — RangeFacetValue.of("*", 100) means "0 to 100"
 */
export interface RangeFacetValue {
	/** Field name to facet by range */
	field: string;
	/** Range lower bound. Use `*` for unbounded. */
	min: number | string | "*";
	/** Range upper bound. Use `*` for unbounded. */
	max: number | string | "*";
}

/**
 * Build a range facet string for the facet_by parameter.
 * E.g. `buildRangeFacetBy("price", 0, 100)` → `"price:range:(0..100)"`
 * E.g. `buildRangeFacetBy("price", 0, "*")` → `"price:range:(0..*)"`
 */
export function buildRangeFacetBy(range: RangeFacetValue): string {
	return `${range.field}:range:(${range.min}..${range.max})`;
}

/**
 * Build a facet_by string combining regular facets and range facets.
 * Regular facets are passed as-is; range facets are converted to
 * Typesense range syntax.
 */
export function buildFacetByWithRanges(
	regularFacetBy: string | undefined,
	rangeFacets: RangeFacetValue[] | undefined,
): string | undefined {
	const parts: string[] = [];
	if (regularFacetBy) {
		// Keep range-encoded facets separate — strip any ranges from regular
		const regularParts = regularFacetBy
			.split(",")
			.map((f) => f.trim())
			.filter((f) => f && !f.includes(":range:("));
		parts.push(...regularParts);
	}
	if (rangeFacets?.length) {
		parts.push(...rangeFacets.map(buildRangeFacetBy));
	}
	return parts.length > 0 ? parts.join(",") : undefined;
}

/**
 * Parse a facet_by string into its components: regular fields and range facets.
 */
export function parseRangeFacets(facetBy: string): {
	regular: string[];
	ranges: RangeFacetValue[];
} {
	const regular: string[] = [];
	const ranges: RangeFacetValue[] = [];

	if (!facetBy) return { regular, ranges };

	for (const part of facetBy.split(",")) {
		const trimmed = part.trim();
		if (!trimmed) continue;

		// Check for range syntax: field:range:(min..max)
		const rangeMatch = trimmed.match(/^([\w.-]+):range:\((.+?)\.\.(.+?)\)$/);
		if (rangeMatch) {
			ranges.push({
				field: rangeMatch[1]!,
				min: rangeMatch[2]!,
				max: rangeMatch[3]!,
			});
		} else {
			regular.push(trimmed);
		}
	}

	return { regular, ranges };
}

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
	// ── Curation & Override (Typesense v0.30+) ─────────────────────
	/** Document IDs to pin at the top of results. Comma-separated. */
	pinnedHits?: string;
	/** Document IDs to hide/exclude from results. Comma-separated. */
	hiddenHits?: string;
	/** Curation set tag to filter search results by. */
	curationTags?: string;
	// ── Range Facets (Typesense v0.30+) ─────────────────────────
	/**
	 * Numeric or date range facets. Each entry generates a separate
	 * field:range:(min..max) clause in the facet_by parameter.
	 * Example: [{ field: "price", min: 0, max: 100 }] → price:range:(0..100)
	 */
	rangeFacets?: RangeFacetValue[];
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

/**
 * Remove filter clauses matching a specific facet field from a Typesense filter_by expression.
 * Handles field:=value, field:[v1,v2], field:>value, etc. by removing the top-level `&&` clause.
 */
export function removeFilterByClause(
	filterBy: string | undefined,
	fieldName: string,
): string | undefined {
	if (!filterBy) return undefined;

	// Split by top-level AND. Handle parenthesized groups.
	const clauses = splitTopLevelAnd(filterBy);
	const strippedField = fieldName.replace(/^\(/, "").replace(/\)$/, "");
	const remaining = clauses.filter((c) => {
		const trimmed = c.trim();
		// Check if clause starts with fieldname: after optional opening paren
		const cleaned = trimmed.replace(/^\(/, "");
		return !cleaned.startsWith(`${strippedField}:`);
	});

	if (remaining.length === 0) return undefined;
	return remaining.join(" && ");
}

/**
 * Split a Typesense filter_by string into top-level AND clauses,
 * respecting parenthesized groups.
 */
function splitTopLevelAnd(filterBy: string): string[] {
	const clauses: string[] = [];
	let depth = 0;
	let current = "";

	for (const ch of filterBy) {
		if (ch === "(") depth++;
		else if (ch === ")") depth--;
		else if (ch === "&" && depth === 0) {
			// Skip next '&'
			if (current.endsWith("&")) continue;
		}

		if (ch === "&" && depth === 0) {
			if (current.trim()) {
				clauses.push(current.trim());
				current = "";
			}
			// Skip the second '&'
			continue;
		}

		current += ch;
	}

	if (current.trim()) {
		clauses.push(current.trim());
	}

	return clauses;
}

/**
 * Parse a comma-separated facet_by string into field names.
 */
export function parseFacetBy(facetBy: string | undefined): string[] {
	if (!facetBy) return [];
	return facetBy
		.split(",")
		.map((f) => f.trim())
		.filter(Boolean);
}

/**
 * Compute disjunctive facet counts for fields where the user has active selections.
 *
 * For each disjunctive facet, fires a sub-query WITHOUT that facet's filter clauses
 * to get correct "OR" counts. For example, selecting brand=Apple AND category=Phones:
 *   - brand counts come from a query WITHOUT brand filter (only category=Phones)
 *   - category counts come from a query WITHOUT category filter (only brand=Apple)
 *
 * Merges disjunctive counts into the main result's facetCounts, returning all
 * fields with their disjunctive counts.
 */
export async function computeDisjunctiveFacetCounts(input: {
	alias: string;
	tenantId: string;
	q: string;
	queryBy?: string;
	filterBy?: string;
	facetBy?: string;
	disjunctiveFacets: string[];
	existingFacetCounts: FacetCount[];
}): Promise<FacetCount[]> {
	const { alias, tenantId, q, queryBy, filterBy, disjunctiveFacets, existingFacetCounts } = input;

	if (!disjunctiveFacets.length || !filterBy) return existingFacetCounts;

	// Build a map of existing counts (non-disjunctive)
	const existingMap = new Map<string, FacetCount>();
	for (const fc of existingFacetCounts) {
		existingMap.set(fc.field_name, fc);
	}

	// For each disjunctive facet that has active selections, fire a sub-query
	const aliasName = alias;

	const results = await Promise.all(
		disjunctiveFacets.map(async (field) => {
			// Remove THIS field's filter clause
			const subFilter = removeFilterByClause(filterBy, field);
			if (subFilter === filterBy) {
				// No filter clause for this field — nothing to do
				return null;
			}

			try {
				// Build sub-query params — only need facet counts, minimize overhead
				const subParams: Record<string, unknown> = {
					q,
					query_by: queryBy ?? "",
					filter_by: combineTenantFilter(tenantId, subFilter),
					facet_by: field, // Only request this facet
					max_facet_values: 1000,
					per_page: 0, // No hits needed
					page: 1,
				};

				const { result: response } = await withSearchFailover(
					{ organizationId: input.tenantId, allowRegionOverride: true },
					async (failoverClient) =>
						failoverClient
							.collections(aliasName)
							.documents()
							.search(subParams as any),
				);

				const facetCounts = (response.facet_counts ?? []) as FacetCount[];
				if (facetCounts.length > 0) {
					return { field, counts: facetCounts[0]!.counts };
				}
				return null;
			} catch {
				return null;
			}
		}),
	);

	// Merge sub-query results into existing counts
	const merged = [...existingFacetCounts];

	for (const result of results) {
		if (!result) continue;
		const idx = merged.findIndex((fc) => fc.field_name === result.field);
		if (idx >= 0) {
			merged[idx] = {
				field_name: result.field,
				counts: result.counts,
			};
		} else {
			merged.push({
				field_name: result.field,
				counts: result.counts,
			});
		}
	}

	return merged;
}

function buildMultiLocationFilter(filter: GeoMultiLocationFilter): string {
	const field = filter.field ?? "_geoloc";
	return filter.locations
		.map((loc) => `${field}:(${loc.lat}, ${loc.lng}, ${loc.radiusKm} km)`)
		.join(" || ");
}

export async function searchDocuments(input: SearchDocumentsInput): Promise<SearchDocumentsResult> {
	const perPage = Math.min(
		Math.max(input.perPage ?? config.defaultPerPage, 1),
		config.maxPerPage,
	);

	let vectorQuery = input.vectorQuery;
	if (vectorQuery !== undefined && input.vectorQueryEf !== undefined) {
		// Append ef parameter to the vector query string, e.g. "vec:([...], k:10, ef:200)"
		vectorQuery = vectorQuery.replace(/\)$/, `, ef:${input.vectorQueryEf})`);
	}

	// Merge regular facet_by with range facets
	const effectiveFacetBy = buildFacetByWithRanges(input.facetBy, input.rangeFacets);

	const params: TypesenseSearchParams = {
		q: input.q,
		query_by: input.queryBy ?? "",
		filter_by: combineTenantFilter(input.tenantId, input.filterBy),
		facet_by: effectiveFacetBy,
		sort_by: input.sortBy,
		per_page: perPage,
		page: input.page ?? 1,
		highlight_fields: input.highlightFields,
		vector_query: vectorQuery,
	};

	const { result: response } = await withSearchFailover(
		{ organizationId: input.tenantId, allowRegionOverride: true },
		async (client) =>
			client
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
					// ── Curation & Override ──
					...(input.pinnedHits !== undefined && {
						pinned_hits: input.pinnedHits,
					}),
					...(input.hiddenHits !== undefined && {
						hidden_hits: input.hiddenHits,
					}),
					...(input.curationTags !== undefined && {
						curation_tags: input.curationTags,
					}),
				} as any),
	);

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
	const tenantId = entries[0]?.tenantId;
	if (!tenantId) {
		// No tenant — use default client (no failover possible)
		const searches = entries.map((entry) => buildMultiSearchEntry(entry));
		const client = getTypesenseClient();
		const response = await client.multiSearch.perform({ searches: searches as any });
		return parseMultiSearchResults(response, entries);
	}

	const searches = entries.map((entry) => buildMultiSearchEntry(entry));

	const { result: response } = await withSearchFailover(
		{ organizationId: tenantId, allowRegionOverride: true },
		async (client) => client.multiSearch.perform({ searches: searches as any }) as any,
	);

	return parseMultiSearchResults(response, entries);
}

function buildMultiSearchEntry(entry: MultiSearchEntry): Record<string, unknown> {
	const perPage = Math.min(
		Math.max(entry.perPage ?? config.defaultPerPage, 1),
		config.maxPerPage,
	);
	let vectorQuery = entry.vectorQuery;
	if (vectorQuery !== undefined && entry.vectorQueryEf !== undefined) {
		vectorQuery = vectorQuery.replace(/\)$/, `, ef:${entry.vectorQueryEf})`);
	}
	// Merge regular facet_by with range facets
	const effectiveFacetBy = buildFacetByWithRanges(entry.facetBy, entry.rangeFacets);

	return {
		collection: entry.alias,
		q: entry.q,
		query_by: entry.queryBy ?? "",
		filter_by: combineTenantFilter(entry.tenantId, entry.filterBy),
		facet_by: effectiveFacetBy,
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
		// ── Curation & Override ──
		...(entry.pinnedHits !== undefined && {
			pinned_hits: entry.pinnedHits,
		}),
		...(entry.hiddenHits !== undefined && {
			hidden_hits: entry.hiddenHits,
		}),
		...(entry.curationTags !== undefined && {
			curation_tags: entry.curationTags,
		}),
	};
}

function parseMultiSearchResults(
	response: unknown,
	entries: MultiSearchEntry[],
): SearchDocumentsResult[] {
	const results =
		(response as unknown as { results: Array<Record<string, unknown>> }).results ?? [];
	return results.map((r, idx) => ({
		hits: (r.hits as unknown[]) ?? [],
		found: (r.found as number) ?? 0,
		page: (r.page as number) ?? 1,
		perPage: (r.per_page as number) ?? entries[idx]?.perPage ?? 10,
		facetCounts: (r.facet_counts as FacetCount[]) ?? [],
		searchTimeMs: (r.search_time_ms as number) ?? 0,
		queryId: (r as unknown as Record<string, unknown>).query_id as string | undefined,
	}));
}
