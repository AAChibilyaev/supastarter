/**
 * Shared types for the AACSearch SDK.
 */

// ── Client options ───────────────────────────────────────────────────────

export interface ClientOptions {
	/** Origin of the AACSearch deployment, e.g. `https://app.aacsearch.com`. */
	baseUrl: string;
	/** API key. Use `ss_search_*` or `ss_scoped_*` for SearchClient,
	 *  `aa_admin_*` for AdminClient. */
	apiKey: string;
	/** Override the default `fetch` (e.g. for SSR / Node ≤ 18). */
	fetchImpl?: typeof fetch;
}

export interface SearchClientOptions extends ClientOptions {
	/** Public index slug to search against. */
	indexSlug: string;
}

// ── Search ───────────────────────────────────────────────────────────────

export interface SearchParams {
	q?: string;
	queryBy?: string;
	filterBy?: string;
	facetBy?: string;
	sortBy?: string;
	perPage?: number;
	page?: number;
	highlightFields?: string;
	// ── Typo Tolerance ──
	numTypos?: number;
	typoTokensThreshold?: number;
	dropTokensThreshold?: number;
	exact?: boolean | string;
	prioritizeExactMatch?: boolean;
	// ── Prefix & Infix ──
	prefix?: boolean | string;
	infix?: string;
	queryByWeights?: string;
	// ── Search Params Extensions ──
	excludeFields?: string;
	highlightStartTag?: string;
	highlightEndTag?: string;
	curationTags?: string;
	hybridConfidence?: number;
	// ── Faceted Search extensions ──
	facetQuery?: string;
	maxFacetValues?: number;
	/** Aggressiveness of adaptive facet sampling (0–1). Lower = more aggressive sampling. */
	facetSampleSlope?: number;
	/** Minimum number of documents before adaptive facet sampling kicks in. */
	facetSampleThreshold?: number;
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
	facetCounts?: FacetCount[];
	searchTimeMs: number;
	/** Query ID for associating analytics events (click, conversion, visit) with this search. */
	queryId?: string | null;
}

export interface MultiSearchResult {
	results: SearchResult[];
}

// ── Analytics Events ─────────────────────────────────────────────────────

export type TrackEventType =
	| "search_query"
	| "zero_results"
	| "result_click"
	| "widget_open"
	| "filter_used"
	| "conversion"
	| "visit"
	| "click";

export interface TrackEventInput {
	type: TrackEventType;
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

export interface TrackEventResult {
	accepted: number;
	rejected: number;
}

// ── Index ────────────────────────────────────────────────────────────────

export interface FieldDefinition {
	name: string;
	type: string;
	facet?: boolean;
	optional?: boolean;
	index?: boolean;
	store?: boolean;
	sort?: boolean;
	infix?: boolean;
	locale?: string;
}

export interface IndexSchema {
	fields: FieldDefinition[];
	defaultSortingField?: string;
}

export interface Index {
	id: string;
	slug: string;
	displayName: string;
	version: number;
	enabled: boolean;
	organizationId: string;
	schema?: IndexSchema;
	apiKeysCount?: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateIndexInput {
	slug: string;
	displayName: string;
	fields: FieldDefinition[];
	defaultSortingField?: string;
}

export interface UpdateIndexInput {
	displayName?: string;
	enabled?: boolean;
}

export interface IndexStats {
	id: string;
	slug: string;
	displayName: string;
	version: number;
	documentCount: number;
	usage: {
		since: string;
		totalSearches: number;
		totalIndexed: number;
		zeroResultCount: number;
		clickCount: number;
	};
	ingestQueue: {
		pending: number;
		failed: number;
	};
	apiKeysCount: number;
	createdAt: string;
	updatedAt: string;
}

// ── Documents ────────────────────────────────────────────────────────────

export interface BrowseDocumentsResult {
	hits: SearchHit[];
	found: number;
	page: number;
	perPage: number;
}

export interface BatchResult {
	queued: number;
	accepted: number;
}

// ── API Keys ─────────────────────────────────────────────────────────────

export type KeyScope = "admin" | "ingest" | "search";

export interface CreateKeyInput {
	indexSlug: string;
	name: string;
	scopes: KeyScope[];
	allowedOrigins?: string[];
	rateLimitPerMinute?: number;
	expiresAt?: string;
}

export interface ApiKey {
	id: string;
	name: string;
	prefix: string;
	scopes: KeyScope[];
	allowedOrigins: string[] | null;
	rateLimitPerMinute: number | null;
	expiresAt: string | null;
	revokedAt: string | null;
	lastUsedAt: string | null;
	createdAt: string;
	indexSlug?: string;
	indexDisplayName?: string;
}

export interface CreateKeyResult extends ApiKey {
	rawKey: string;
}

// ── Project ──────────────────────────────────────────────────────────────

export interface Project {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	membersCount: number;
	createdAt: string;
}

export interface CreateProjectInput {
	name: string;
	slug: string;
	logo?: string;
}

// ── Analytics ────────────────────────────────────────────────────────────

export interface AnalyticsQuery {
	period?: "last7" | "last30";
}

export interface AnalyticsResult {
	totalSearches: number;
	totalSessions: number;
	topQueries: Array<{ query: string; count: number }>;
	zeroResultQueries: Array<{ query: string; count: number }>;
	topClickedProducts: Array<{ productId: string; title: string; clicks: number }>;
	ctr: number;
	searchesOverTime: Array<{ date: string; count: number }>;
}

export interface UsageRow {
	type: string;
	totalCount: number;
	since: string;
}

// ── Synonyms ─────────────────────────────────────────────────────────────

export interface Synonym {
	id: string;
	root: string;
	replacements: string[];
	locale?: string;
}

export interface CreateSynonymInput {
	root: string;
	replacements: string[];
	locale?: string;
}

// ── Curations ────────────────────────────────────────────────────────────

export interface Curation {
	id: string;
	query: string;
	pinnedIds: string[];
	hiddenIds: string[];
	boostedIds: string[];
}

export interface CreateCurationInput {
	query: string;
	pinnedIds?: string[];
	hiddenIds?: string[];
	boostedIds?: string[];
}

// ── Sorting ──────────────────────────────────────────────────────────────

export interface SortingField {
	name: string;
	field: string;
	direction: "asc" | "desc";
}

export interface CreateSortingFieldInput {
	name: string;
	field: string;
	direction: "asc" | "desc";
}

// ── Facets ───────────────────────────────────────────────────────────────

export interface FacetField {
	name: string;
	type: string;
}

// ── Error ────────────────────────────────────────────────────────────────

export type SdkErrorCode =
	| "missing_bearer_token"
	| "invalid_or_revoked_key"
	| "forbidden"
	| "not_found"
	| "rate_limited"
	| "quota_exceeded"
	| "conflict"
	| "invalid_input"
	| "invalid_json"
	| "internal_error"
	| "search_failed"
	| "network_error"
	| "unauthorized"
	| "unexpected";

export class SdkError extends Error {
	readonly code: SdkErrorCode;
	readonly status: number;
	readonly details?: unknown;

	constructor(code: SdkErrorCode, status: number, message: string, details?: unknown) {
		super(message);
		this.name = "SdkError";
		this.code = code;
		this.status = status;
		this.details = details;
	}
}
