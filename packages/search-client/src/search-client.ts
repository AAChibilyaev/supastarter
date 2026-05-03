/**
 * Browser-safe customer-facing client for the AACSearch public search API.
 *
 * IMPORTANT: only embed `ss_search_*` (search-only) or `ss_scoped_*` tokens.
 * Never bundle admin/write keys — those grant index management rights.
 */
import { request } from "./transport";
import type {
	MultiSearchResult,
	SearchClientOptions,
	SearchParams,
	SearchResult,
	TrackEventInput,
	TrackEventResult,
} from "./types";

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

	// ── Analytics Events ─────────────────────────────────────────────────

	/**
	 * Send a generic analytics event (click, conversion, visit, search_query, etc.).
	 * Uses `sendBeacon` when available (document.hidden / pagehide) for reliable
	 * page-exit tracking; falls back to `fetch` for synchronous sends.
	 */
	async trackEvent(input: TrackEventInput): Promise<TrackEventResult> {
		const base = this.baseUrl.replace(/\/+$/, "");
		const path = "/api/analytics/events/track";
		const url = `${base}${path}`;
		const body = JSON.stringify(input);

		// Use sendBeacon for reliable page-exit tracking (no auth header possible,
		// so apiKey is embedded in the body)
		if (typeof navigator !== "undefined" && navigator.sendBeacon) {
			const sent = navigator.sendBeacon(url, body);
			if (sent) {
				return { accepted: 1, rejected: 0 };
			}
		}

		// Fallback: use fetch with Bearer token
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`,
			},
			body,
		});

		if (!res.ok) {
			throw new Error(`trackEvent failed: ${res.status}`);
		}

		return res.json() as Promise<TrackEventResult>;
	}

	/**
	 * Track a click on a search result document.
	 * `queryId` should come from the preceding `search()` or `multiSearch()` response.
	 */
	async trackClick(docId: string, position: number, queryId?: string): Promise<TrackEventResult> {
		return this.trackEvent({
			type: "click",
			productId: docId,
			position,
			queryId,
		});
	}

	/**
	 * Track a conversion (purchase, add-to-cart, signup, etc.) after a search.
	 * `queryId` should come from the preceding `search()` or `multiSearch()` response.
	 */
	async trackConversion(
		docId: string,
		conversionType?: string,
		queryId?: string,
	): Promise<TrackEventResult> {
		return this.trackEvent({
			type: "conversion",
			productId: docId,
			conversionType,
			queryId,
		});
	}

	/**
	 * Track a page view / visit associated with a search result.
	 * `queryId` should come from the preceding `search()` or `multiSearch()` response.
	 */
	async trackVisit(docId?: string, queryId?: string): Promise<TrackEventResult> {
		return this.trackEvent({
			type: "visit",
			productId: docId,
			queryId,
		});
	}
}
