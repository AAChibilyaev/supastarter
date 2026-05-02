/**
 * Browser-safe customer-facing client for the AACSearch public search API.
 *
 * IMPORTANT: only embed `ss_search_*` (search-only) or `ss_scoped_*` tokens.
 * Never bundle admin/write keys — those grant index management rights.
 */
import { request } from "./transport";
import type { MultiSearchResult, SearchClientOptions, SearchParams, SearchResult } from "./types";

export class SearchClient {
	private readonly baseUrl: string;
	private readonly apiKey: string;
	private readonly indexSlug: string;
	private readonly fetchImpl: typeof fetch | undefined;

	constructor(opts: SearchClientOptions) {
		if (!opts.baseUrl) throw new Error("SearchClient: baseUrl is required");
		if (!opts.apiKey) throw new Error("SearchClient: apiKey is required");
		if (!opts.indexSlug) throw new Error("SearchClient: indexSlug is required");
		this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
		this.apiKey = opts.apiKey;
		this.indexSlug = opts.indexSlug;
		this.fetchImpl = opts.fetchImpl;
	}

	/** Search the index with text query and optional filters. */
	async search(params: SearchParams = {}): Promise<SearchResult> {
		return request<SearchResult>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v1/indexes/${encodeURIComponent(this.indexSlug)}/search`,
			params,
			this.fetchImpl,
		);
	}

	/** Search multiple queries against the index in one request. */
	async multiSearch(searches: SearchParams[]): Promise<MultiSearchResult> {
		return request<MultiSearchResult>(
			this.baseUrl,
			this.apiKey,
			"POST",
			"/api/v1/multi-search",
			{ searches },
			this.fetchImpl,
		);
	}
}
