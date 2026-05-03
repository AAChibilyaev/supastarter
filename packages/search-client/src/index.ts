/**
 * Browser-safe customer-facing client for the AACSearch public search API.
 *
 * IMPORTANT: only embed `ss_search_*` (search-only) or `ss_scoped_*` tokens.
 * Never bundle admin/write keys — those grant index management rights.
 */

export interface SearchClientOptions {
	/** Origin of the AACSearch deployment, e.g. `https://app.example.com`. */
	baseUrl: string;
	/** A search-scope key (`ss_search_…`) or a scoped token (`ss_scoped_…`). */
	apiKey: string;
	/** Public index slug to search against. */
	indexSlug: string;
	/** Override the default `fetch` (e.g. for SSR / Node ≤ 18). */
	fetchImpl?: typeof fetch;
}

export interface SearchParams {
	q: string;
	queryBy?: string;
	filterBy?: string;
	facetBy?: string;
	sortBy?: string;
	perPage?: number;
	page?: number;
	highlightFields?: string;
	/** How query tokens should match: 'all' (AND), 'any' (OR), or 'max_score'. */
	textMatchType?: "all" | "any" | "max_score";
	/** Abort search after N milliseconds and return partial results. */
	searchCutoffMs?: number;
	/** Cache identical search requests within the cache_ttl window. */
	useCache?: boolean;
}

export interface SearchHit {
	document: Record<string, unknown>;
	highlights?: unknown[];
}

export interface FacetCount {
	field_name: string;
	counts: Array<{ value: string; count: number }>;
}

export interface SearchResult {
	hits: SearchHit[];
	found: number;
	page: number;
	perPage: number;
	facetCounts: FacetCount[];
	searchTimeMs: number;
}

export interface MultiSearchResult {
	results: SearchResult[];
}

export type SearchClientErrorCode =
	| "missing_bearer_token"
	| "invalid_or_revoked_key"
	| "invalid_or_expired_scoped_token"
	| "key_does_not_match_index"
	| "origin_not_allowed"
	| "rate_limited"
	| "quota_exceeded"
	| "invalid_input"
	| "search_failed"
	| "network_error"
	| "unexpected";

export class SearchClientError extends Error {
	readonly code: SearchClientErrorCode;
	readonly status: number;
	readonly details?: unknown;

	constructor(code: SearchClientErrorCode, status: number, message: string, details?: unknown) {
		super(message);
		this.name = "SearchClientError";
		this.code = code;
		this.status = status;
		this.details = details;
	}
}

export class SearchClient {
	private readonly baseUrl: string;
	private readonly apiKey: string;
	private readonly indexSlug: string;
	private readonly fetchImpl: typeof fetch;

	constructor(opts: SearchClientOptions) {
		if (!opts.baseUrl) throw new Error("SearchClient: baseUrl is required");
		if (!opts.apiKey) throw new Error("SearchClient: apiKey is required");
		if (!opts.indexSlug) throw new Error("SearchClient: indexSlug is required");
		this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
		this.apiKey = opts.apiKey;
		this.indexSlug = opts.indexSlug;
		this.fetchImpl = opts.fetchImpl ?? fetch;
	}

	async search(params: SearchParams): Promise<SearchResult> {
		const url = `${this.baseUrl}/api/search/public/${encodeURIComponent(this.indexSlug)}`;
		return this.post<SearchResult>(url, params);
	}

	async multiSearch(searches: SearchParams[]): Promise<MultiSearchResult> {
		const url = `${this.baseUrl}/api/search/public/multi`;
		return this.post<MultiSearchResult>(url, { searches });
	}

	private async post<T>(url: string, body: unknown): Promise<T> {
		let response: Response;
		try {
			response = await this.fetchImpl(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(body),
			});
		} catch (cause) {
			throw new SearchClientError(
				"network_error",
				0,
				cause instanceof Error ? cause.message : "network error",
			);
		}

		const text = await response.text();
		let payload: unknown = undefined;
		if (text) {
			try {
				payload = JSON.parse(text);
			} catch {
				// fall through — non-JSON
			}
		}

		if (!response.ok) {
			const code = (payload as { error?: SearchClientErrorCode })?.error ?? "unexpected";
			const details = (payload as { details?: unknown })?.details;
			throw new SearchClientError(
				code,
				response.status,
				`Search request failed: ${response.status} ${code}`,
				details,
			);
		}

		return payload as T;
	}
}
