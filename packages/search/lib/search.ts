import "server-only";
import { config } from "../config";
import { getTypesenseClient } from "./client";

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

	const response = await client.collections(input.alias).documents().search(params);

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
		};
	});

	const response = await client.multiSearch.perform({ searches });
	const results = (response as { results: Array<Record<string, unknown>> }).results ?? [];

	return results.map((r, idx) => ({
		hits: (r.hits as unknown[]) ?? [],
		found: (r.found as number) ?? 0,
		page: (r.page as number) ?? 1,
		perPage: searches[idx].per_page,
		facetCounts: (r.facet_counts as unknown[]) ?? [],
		searchTimeMs: (r.search_time_ms as number) ?? 0,
	}));
}
