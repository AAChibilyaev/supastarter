/**
 * Query mapper — translates Algolia InstantSearch search parameters
 * into AACsearch search parameters.
 *
 * @see https://typesense.org/docs/26.0/api/search.html
 * @module @aacsearch/instantsearch-adapter
 */

import type { AlgoliaSearchParams, AlgoliaSearchRequest } from "./types";

// ─── AACsearch Parameters Shape ────────────────────────────────────────────

/** The shape of parameters sent to the AACsearch search endpoint. */
export interface AACsearchParams {
	q?: string;
	query_by?: string;
	filter_by?: string;
	facet_by?: string;
	sort_by?: string;
	per_page?: number;
	page?: number;
	highlight_fields?: string;
	highlight_full_fields?: string;
	highlight_start_tag?: string;
	highlight_end_tag?: string;
	snippet_fields?: string;
	snippet_ellipsis_text?: string;
	max_facet_values?: number;
	facet_query?: string;
	prioritize_exact_match?: boolean;
	exact?: boolean | string;
	num_typos?: number;
	prefix?: boolean | string;
	drop_tokens_threshold?: number;
	typo_tokens_threshold?: number;
	query_by_weights?: string;
	pre_segmented_query?: boolean;
	enable_overrides?: boolean;
	enable_rules?: boolean;
	enable_analytics?: boolean;
	[parameter: string]: unknown;
}

// ─── Parsed Filter ─────────────────────────────────────────────────────────

interface ParsedFilter {
	readonly positive: string[];
	readonly negative: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Parse facetFilters into a filter_by expression.
 *
 * Algolia facetFilters format:
 *   ["category:Electronics", "brand:Apple"]          → AND
 *   [["category:Electronics", "category:Clothing"]]  → OR within array
 *   ["price:>100", ["color:Red", "color:Blue"]]      → mixed AND/OR
 */
function parseFacetFilters(filters: ReadonlyArray<string | string[]>): string {
	const parts: string[] = [];

	for (const entry of filters) {
		if (typeof entry === "string") {
			// AND — single facet value
			const translated = translateFacetFilter(entry);
			if (translated) parts.push(translated);
		} else if (Array.isArray(entry)) {
			// OR — multiple values for same or different facets
			const orParts: string[] = [];
			for (const sub of entry) {
				const translated = translateFacetFilter(sub);
				if (translated) orParts.push(translated);
			}
			if (orParts.length > 0) {
				parts.push(`(${orParts.join(" || ")})`);
			}
		}
	}

	return parts.join(" && ");
}

/**
 * Translate a single Algolia facet filter string to AACsearch filter_by syntax.
 *
 * Algolia: "field:value" or "field:>value" or "field:<value"
 * AACsearch (Typesense-compatible): "field:=value" or "field:>value" or "field:<value"
 */
function translateFacetFilter(filter: string): string {
	const colonIndex = filter.indexOf(":");
	if (colonIndex === -1) return filter;

	const field = filter.slice(0, colonIndex);
	const value = filter.slice(colonIndex + 1);

	if (
		value.startsWith(">") ||
		value.startsWith("<") ||
		value.startsWith(">=") ||
		value.startsWith("<=")
	) {
		return `${field}:${value}`;
	}

	// Negation — Algolia uses "-field:value" prefix on the field name
	if (field.startsWith("-")) {
		return `${field.slice(1)}:!=${value}`;
	}

	// Exact match or range
	if (value.startsWith("[") && value.endsWith("]")) {
		return `${field}:${value}`;
	}

	return `${field}:=${value}`;
}

/**
 * Parse numericFilters into a filter_by expression.
 *
 * Algolia numericFilters format:
 *   ["price > 100", "price <= 200"]  → AND
 *   [["price > 100", "price < 50"]]  → OR
 */
function parseNumericFilters(filters: readonly string[]): string {
	return filters
		.map((f) => {
			// Convert "field op value" → "field:opvalue"
			return f.replace(/^(\w+)\s*(>=?|<=?|=)\s*(.+)$/, (_, field, op, value) => {
				return `${field}:${op}${value.trim()}`;
			});
		})
		.join(" && ");
}

// ─── Main Mapper ───────────────────────────────────────────────────────────

/**
 * Map an Algolia search request (index + params) to AACsearch search parameters,
 * merged with any base additional params and per-index overrides.
 */
export function mapQuery(
	request: AlgoliaSearchRequest,
	additionalParams: Record<string, unknown>,
	collectionParams: Record<string, Record<string, unknown>>,
): { indexSlug: string; params: AACsearchParams } {
	const algoliaParams = request.params ?? {};
	const indexName = request.indexName;

	// Resolve per-index overrides
	const indexOverrides = collectionParams[indexName] ?? {};
	const mergedParams = { ...additionalParams, ...indexOverrides } as Record<string, unknown>;

	const params: AACsearchParams = {};

	// ── Core query ────────────────────────────────────────────────────
	if (algoliaParams.query) {
		params.q = algoliaParams.query;
	}

	// ── Pagination ────────────────────────────────────────────────────
	if (algoliaParams.hitsPerPage !== undefined) {
		params.per_page = algoliaParams.hitsPerPage;
	}
	if (algoliaParams.page !== undefined) {
		params.page = algoliaParams.page;
	}

	// ── Facets ────────────────────────────────────────────────────────
	if (algoliaParams.facets && algoliaParams.facets.length > 0) {
		params.facet_by = algoliaParams.facets.join(",");
	}

	if (algoliaParams.facetFilters && algoliaParams.facetFilters.length > 0) {
		params.filter_by = parseFacetFilters(algoliaParams.facetFilters);
	}

	if (algoliaParams.numericFilters && algoliaParams.numericFilters.length > 0) {
		const numericExpr = parseNumericFilters(algoliaParams.numericFilters);
		if (params.filter_by && numericExpr) {
			params.filter_by = `${params.filter_by} && ${numericExpr}`;
		} else if (numericExpr) {
			params.filter_by = numericExpr;
		}
	}

	// ── Highlighting ──────────────────────────────────────────────────
	if (algoliaParams.attributesToHighlight && algoliaParams.attributesToHighlight.length > 0) {
		params.highlight_fields = algoliaParams.attributesToHighlight.join(",");
	}
	if (algoliaParams.highlightPreTag) {
		params.highlight_start_tag = algoliaParams.highlightPreTag;
	}
	if (algoliaParams.highlightPostTag) {
		params.highlight_end_tag = algoliaParams.highlightPostTag;
	}

	// ── Snippet ───────────────────────────────────────────────────────
	if (algoliaParams.attributesToSnippet && algoliaParams.attributesToSnippet.length > 0) {
		params.snippet_fields = algoliaParams.attributesToSnippet.join(",");
	}
	if (algoliaParams.snippetEllipsisText) {
		params.snippet_ellipsis_text = algoliaParams.snippetEllipsisText;
	}

	// ── Geo Search ────────────────────────────────────────────────────
	if (algoliaParams.aroundLatLng) {
		// Translate to AACsearch filter_by geo syntax
		const geoFilter = `_geoloc(${algoliaParams.aroundLatLng}, ${algoliaParams.aroundRadius ?? 100000})`;
		if (params.filter_by) {
			params.filter_by = `${params.filter_by} && ${geoFilter}`;
		} else {
			params.filter_by = geoFilter;
		}
	}

	// ── Analytics & Rules ─────────────────────────────────────────────
	if (algoliaParams.analytics !== undefined) {
		params.enable_analytics = algoliaParams.analytics;
	}
	if (algoliaParams.enableRules !== undefined) {
		params.enable_rules = algoliaParams.enableRules;
	}

	// ── Pass through additional params ────────────────────────────────
	for (const [key, value] of Object.entries(mergedParams)) {
		if (value !== undefined && !(key in params)) {
			(params as Record<string, unknown>)[key] = value;
		}
	}

	return { indexSlug: indexName, params };
}
