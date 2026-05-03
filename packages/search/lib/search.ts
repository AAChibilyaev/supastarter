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
	// ── Typo Tolerance (Typesense v0.30+) ──────────────────────────
	num_typos?: number;
	typo_tokens_threshold?: number;
	drop_tokens_threshold?: number;
	exact?: boolean | string;
	prioritize_exact_match?: boolean;
	// ── Prefix & Infix ─────────────────────────────────────────────
	prefix?: boolean | string;
	infix?: string;
	query_by_weights?: string;
	// ── Geo Search ─────────────────────────────────────────────────
	polygon_filter?: Record<string, unknown>;
	bounding_box?: Record<string, unknown>;
	// ── Search Params Extensions ───────────────────────────────────
	exclude_fields?: string;
	highlight_start_tag?: string;
	highlight_end_tag?: string;
	override_tags?: string;
	hybrid_confidence?: number;
	// ── Faceted Search extensions ──────────────────────────────────
	facet_query?: string;
	max_facet_values?: number;
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
	// ── Typo Tolerance ─────────────────────────────────────────────
	numTypos?: number;
	typoTokensThreshold?: number;
	dropTokensThreshold?: number;
	exact?: boolean | string;
	prioritizeExactMatch?: boolean;
	// ── Prefix & Infix ─────────────────────────────────────────────
	prefix?: boolean | string;
	infix?: string;
	queryByWeights?: string;
	// ── Geo Search ─────────────────────────────────────────────────
	polygonFilter?: GeoPolygonFilter;
	boundingBoxFilter?: GeoBoundingBoxFilter;
	multiLocation?: GeoMultiLocationFilter;
	// ── Search Params Extensions ───────────────────────────────────
	excludeFields?: string;
	highlightStartTag?: string;
	highlightEndTag?: string;
	overrideTags?: string;
	hybridConfidence?: number;
	// ── Faceted Search extensions ──────────────────────────────────
	facetQuery?: string;
	maxFacetValues?: number;
}

export interface SearchDocumentsResult {
	hits: unknown[];
	found: number;
	page: number;
	perPage: number;
	facetCounts: unknown[];
	searchTimeMs: number;
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

	const perPage = Math.min(Math.max(input.perPage ?? config.defaultPerPage, 1), config.maxPerPage);

	// Build combined filter: user filter + multi-location geo filter
	let combinedUserFilter = input.filterBy;
	if (input.multiLocation) {
		const multiGeoFilter = buildMultiLocationFilter(input.multiLocation);
		combinedUserFilter = combinedUserFilter
			? `${combinedUserFilter} && (${multiGeoFilter})`
			: multiGeoFilter;
	}

	const params: TypesenseSearchParams = {
		q: input.q,
		query_by: input.queryBy ?? "",
		filter_by: combineTenantFilter(input.tenantId, combinedUserFilter),
		facet_by: input.facetBy,
		sort_by: input.sortBy,
		per_page: perPage,
		page: input.page ?? 1,
		highlight_fields: input.highlightFields,
		// ── Typo Tolerance ──
		...(input.numTypos !== undefined && { num_typos: input.numTypos }),
		...(input.typoTokensThreshold !== undefined && {
			typo_tokens_threshold: input.typoTokensThreshold,
		}),
		...(input.dropTokensThreshold !== undefined && {
			drop_tokens_threshold: input.dropTokensThreshold,
		}),
		...(input.exact !== undefined && { exact: input.exact }),
		...(input.prioritizeExactMatch !== undefined && {
			prioritize_exact_match: input.prioritizeExactMatch,
		}),
		// ── Prefix & Infix ──
		...(input.prefix !== undefined && { prefix: input.prefix }),
		...(input.infix !== undefined && { infix: input.infix }),
		...(input.queryByWeights !== undefined && { query_by_weights: input.queryByWeights }),
		// ── Geo Search ──
		...(input.polygonFilter !== undefined && {
			polygon_filter: {
				field: input.polygonFilter.field ?? "_geoloc",
				polygon: input.polygonFilter.polygon,
			} as Record<string, unknown>,
		}),
		...(input.boundingBoxFilter !== undefined && {
			bounding_box: {
				field: input.boundingBoxFilter.field ?? "_geoloc",
				bounding_box: input.boundingBoxFilter.bounding_box,
			} as Record<string, unknown>,
		}),
		// ── Search Params Extensions ──
		...(input.excludeFields !== undefined && { exclude_fields: input.excludeFields }),
		...(input.highlightStartTag !== undefined && {
			highlight_start_tag: input.highlightStartTag,
		}),
		...(input.highlightEndTag !== undefined && { highlight_end_tag: input.highlightEndTag }),
		...(input.overrideTags !== undefined && { override_tags: input.overrideTags }),
		...(input.hybridConfidence !== undefined && { hybrid_confidence: input.hybridConfidence }),
		// ── Faceted Search extensions ──
		...(input.facetQuery !== undefined && { facet_query: input.facetQuery }),
		...(input.maxFacetValues !== undefined && { max_facet_values: input.maxFacetValues }),
	};

	const response = await client
		.collections(input.alias)
		.documents()
		.search(params as any);

	return {
		hits: response.hits ?? [],
		found: response.found ?? 0,
		page: response.page ?? 1,
		perPage,
		facetCounts: response.facet_counts ?? [],
		searchTimeMs: response.search_time_ms ?? 0,
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

		// Build combined filter: user filter + multi-location geo filter
		let combinedMultiFilter = entry.filterBy;
		if (entry.multiLocation) {
			const multiGeoFilter = buildMultiLocationFilter(entry.multiLocation);
			combinedMultiFilter = combinedMultiFilter
				? `${combinedMultiFilter} && (${multiGeoFilter})`
				: multiGeoFilter;
		}

		return {
			collection: entry.alias,
			q: entry.q,
			query_by: entry.queryBy ?? "",
			filter_by: combineTenantFilter(entry.tenantId, combinedMultiFilter),
			facet_by: entry.facetBy,
			sort_by: entry.sortBy,
			per_page: perPage,
			page: entry.page ?? 1,
			highlight_fields: entry.highlightFields,
			// ── Typo Tolerance ──
			...(entry.numTypos !== undefined && { num_typos: entry.numTypos }),
			...(entry.typoTokensThreshold !== undefined && {
				typo_tokens_threshold: entry.typoTokensThreshold,
			}),
			...(entry.dropTokensThreshold !== undefined && {
				drop_tokens_threshold: entry.dropTokensThreshold,
			}),
			...(entry.exact !== undefined && { exact: entry.exact }),
			...(entry.prioritizeExactMatch !== undefined && {
				prioritize_exact_match: entry.prioritizeExactMatch,
			}),
			// ── Prefix & Infix ──
			...(entry.prefix !== undefined && { prefix: entry.prefix }),
			...(entry.infix !== undefined && { infix: entry.infix }),
			...(entry.queryByWeights !== undefined && { query_by_weights: entry.queryByWeights }),
			// ── Geo Search ──
			...(entry.polygonFilter !== undefined && {
				polygon_filter: {
					field: entry.polygonFilter.field ?? "_geoloc",
					polygon: entry.polygonFilter.polygon,
				} as Record<string, unknown>,
			}),
			...(entry.boundingBoxFilter !== undefined && {
				bounding_box: {
					field: entry.boundingBoxFilter.field ?? "_geoloc",
					bounding_box: entry.boundingBoxFilter.bounding_box,
				} as Record<string, unknown>,
			}),
			// ── Search Params Extensions ──
			...(entry.excludeFields !== undefined && { exclude_fields: entry.excludeFields }),
			...(entry.highlightStartTag !== undefined && {
				highlight_start_tag: entry.highlightStartTag,
			}),
			...(entry.highlightEndTag !== undefined && {
				highlight_end_tag: entry.highlightEndTag,
			}),
			...(entry.overrideTags !== undefined && { override_tags: entry.overrideTags }),
			...(entry.hybridConfidence !== undefined && {
				hybrid_confidence: entry.hybridConfidence,
			}),
			// ── Faceted Search extensions ──
			...(entry.facetQuery !== undefined && { facet_query: entry.facetQuery }),
			...(entry.maxFacetValues !== undefined && { max_facet_values: entry.maxFacetValues }),
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
		facetCounts: (r.facet_counts as unknown[]) ?? [],
		searchTimeMs: (r.search_time_ms as number) ?? 0,
	}));
}
