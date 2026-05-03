import type { components } from "./generated/v2-types";
/**
 * Browser-safe customer-facing client for the AACSearch v2 search API.
 *
 * IMPORTANT: only embed `ss_search_*` (search-only) or `ss_scoped_*` tokens.
 * Never bundle admin/write keys — those grant index management rights.
 */
import { request } from "./transport";
import type { ClientOptions } from "./types";

export interface V2SearchClientOptions extends ClientOptions {
	/** Public index slug or ID to search against. */
	indexId: string;
}

export interface V2TrackEventInput {
	type:
		| "search_query"
		| "zero_results"
		| "result_click"
		| "widget_open"
		| "filter_used"
		| "conversion"
		| "visit"
		| "click";
	sessionId?: string;
	anonymousUserId?: string;
	query?: string;
	productId?: string;
	position?: number;
	filters?: Record<string, unknown>;
	sort?: string;
	locale?: string;
	referrer?: string;
	metadata?: Record<string, unknown>;
	queryId?: string;
	conversionType?: string;
}

export interface V2TrackEventResult {
	accepted: number;
	rejected: number;
}

export type V2SearchRequest = components["schemas"]["SearchRequest"];

export class V2SearchClient {
	private readonly baseUrl: string;
	private readonly apiKey: string;
	private readonly indexId: string;
	private readonly fetchImpl: typeof fetch | undefined;

	constructor(opts: V2SearchClientOptions) {
		if (!opts.baseUrl) throw new Error("V2SearchClient: baseUrl is required");
		if (!opts.apiKey) throw new Error("V2SearchClient: apiKey is required");
		if (!opts.indexId) throw new Error("V2SearchClient: indexId is required");
		this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
		this.apiKey = opts.apiKey;
		this.indexId = opts.indexId;
		this.fetchImpl = opts.fetchImpl;
	}

	/** Search the index with text query and optional filters. */
	async search(params: Partial<V2SearchRequest> = {}): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v2/indexes/${encodeURIComponent(this.indexId)}/search`,
			params,
			this.fetchImpl,
		);
	}

	/** Search multiple indexes/queries in one request. */
	async multiSearch(
		searches: Array<{ indexId: string; search: Partial<V2SearchRequest> }>,
	): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"POST",
			"/api/v2/multi-search",
			searches,
			this.fetchImpl,
		);
	}

	// ── Analytics Events (same as v1 — shared analytics endpoint) ───────

	/**
	 * Send a generic analytics event (click, conversion, visit, search_query, etc.).
	 * Uses `sendBeacon` when available for reliable page-exit tracking;
	 * falls back to `fetch` for synchronous sends.
	 */
	async trackEvent(input: V2TrackEventInput): Promise<V2TrackEventResult> {
		const base = this.baseUrl.replace(/\/+$/, "");
		const path = "/api/analytics/events/track";
		const url = `${base}${path}`;
		const body = JSON.stringify(input);

		// Use sendBeacon for reliable page-exit tracking
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

		return res.json() as Promise<V2TrackEventResult>;
	}

	/** Track a click on a search result document. */
	async trackClick(
		docId: string,
		position: number,
		queryId?: string,
	): Promise<V2TrackEventResult> {
		return this.trackEvent({
			type: "click",
			productId: docId,
			position,
			queryId,
		});
	}

	/** Track a conversion after a search. */
	async trackConversion(
		docId: string,
		conversionType?: string,
		queryId?: string,
	): Promise<V2TrackEventResult> {
		return this.trackEvent({
			type: "conversion",
			productId: docId,
			conversionType,
			queryId,
		});
	}

	/** Track a page view / visit associated with a search result. */
	async trackVisit(docId?: string, queryId?: string): Promise<V2TrackEventResult> {
		return this.trackEvent({
			type: "visit",
			productId: docId,
			queryId,
		});
	}
}
