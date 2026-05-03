/**
 * Server-side management client for the AACSearch v1 REST API.
 *
 * Requires an admin-scope API key (`aa_admin_*`). Never bundle in browser code.
 *
 * Usage:
 * ```ts
 * const admin = new AdminClient({
 *   baseUrl: "https://api.aacsearch.com",
 *   apiKey: "aa_admin_...",
 *   projectId: "org_xxx",
 * });
 * ```
 */
import { request } from "./transport";
import type {
	AnalyticsQuery,
	AnalyticsResult,
	ApiKey,
	BatchResult,
	BrowseDocumentsResult,
	ClientOptions,
	CreateCurationInput,
	CreateIndexInput,
	CreateKeyInput,
	CreateKeyResult,
	CreateProjectInput,
	CreateSortingFieldInput,
	CreateSynonymInput,
	Curation,
	FacetField,
	Index,
	IndexStats,
	Project,
	SearchParams,
	SearchResult,
	SortingField,
	Synonym,
	UpdateIndexInput,
	UsageRow,
} from "./types";

export interface AdminClientOptions extends ClientOptions {
	/** The project (organization) ID. Discover via getProject() if unknown. */
	projectId: string;
}

export class AdminClient {
	private readonly baseUrl: string;
	private readonly apiKey: string;
	private readonly projectId: string;
	private readonly fetchImpl: typeof fetch | undefined;

	constructor(opts: AdminClientOptions) {
		if (!opts.baseUrl) throw new Error("AdminClient: baseUrl is required");
		if (!opts.apiKey) throw new Error("AdminClient: apiKey is required");
		if (!opts.projectId) throw new Error("AdminClient: projectId is required");
		this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
		this.apiKey = opts.apiKey;
		this.projectId = opts.projectId;
		this.fetchImpl = opts.fetchImpl;
	}

	// ── Project operations ───────────────────────────────────────────

	/** Get current project details. */
	async getProject(): Promise<Project> {
		return request<Project>(
			this.baseUrl,
			this.apiKey,
			"GET",
			"/api/v1/projects",
			undefined,
			this.fetchImpl,
		);
	}

	/** Create a new project (organization). */
	async createProject(input: CreateProjectInput): Promise<Project> {
		return request<Project>(
			this.baseUrl,
			this.apiKey,
			"POST",
			"/api/v1/projects",
			input,
			this.fetchImpl,
		);
	}

	/** Get project by ID. */
	async getProjectById(id: string): Promise<Project> {
		return request<Project>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/projects/${encodeURIComponent(id)}`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Index operations ─────────────────────────────────────────────

	/** List all indexes in the project. */
	async listIndexes(): Promise<Index[]> {
		return request<Index[]>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/projects/${encodeURIComponent(this.projectId)}/indexes`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Get a single index by its ID. */
	async getIndex(indexId: string): Promise<Index> {
		return request<Index>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/indexes/${encodeURIComponent(indexId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Create a new search index with schema and Typesense collection. */
	async createIndex(input: CreateIndexInput): Promise<Index> {
		return request<Index>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v1/projects/${encodeURIComponent(this.projectId)}/indexes`,
			input,
			this.fetchImpl,
		);
	}

	/** Update index display name and/or enabled status. */
	async updateIndex(indexId: string, input: UpdateIndexInput): Promise<Index> {
		return request<Index>(
			this.baseUrl,
			this.apiKey,
			"PATCH",
			`/api/v1/indexes/${encodeURIComponent(indexId)}`,
			input,
			this.fetchImpl,
		);
	}

	/** Delete an index and its Typesense collections. */
	async deleteIndex(indexId: string): Promise<{ deleted: boolean; id: string; slug: string }> {
		return request(
			this.baseUrl,
			this.apiKey,
			"DELETE",
			`/api/v1/indexes/${encodeURIComponent(indexId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Get index statistics (document count, usage, ingest queue). */
	async getIndexStats(indexId: string): Promise<IndexStats> {
		return request<IndexStats>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/stats`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Document operations ──────────────────────────────────────────

	/** Browse / list documents in an index. */
	async listDocuments(
		indexId: string,
		query?: { q?: string; page?: number; perPage?: number; filterBy?: string },
	): Promise<BrowseDocumentsResult> {
		const params = new URLSearchParams();
		if (query?.q) params.set("q", query.q);
		if (query?.page) params.set("page", String(query.page));
		if (query?.perPage) params.set("perPage", String(query.perPage));
		if (query?.filterBy) params.set("filterBy", query.filterBy);
		const qs = params.toString();
		return request<BrowseDocumentsResult>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/documents${qs ? `?${qs}` : ""}`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Upsert a single document. */
	async upsertDocument(
		indexId: string,
		documentId: string,
		document: Record<string, unknown>,
	): Promise<{ id: string; queued: boolean }> {
		return request(
			this.baseUrl,
			this.apiKey,
			"PUT",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/documents/${encodeURIComponent(documentId)}`,
			document,
			this.fetchImpl,
		);
	}

	/** Batch upsert documents (up to 5000 at a time). */
	async batchUpsertDocuments(
		indexId: string,
		documents: Record<string, unknown>[],
	): Promise<BatchResult> {
		return request<BatchResult>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/documents:batch`,
			{ documents },
			this.fetchImpl,
		);
	}

	/** Batch delete documents by IDs. */
	async batchDeleteDocuments(indexId: string, ids: string[]): Promise<BatchResult> {
		return request<BatchResult>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/documents:batchDelete`,
			{ ids },
			this.fetchImpl,
		);
	}

	/** Delete a single document. */
	async deleteDocument(
		indexId: string,
		documentId: string,
	): Promise<{ id: string; deleted: boolean }> {
		return request(
			this.baseUrl,
			this.apiKey,
			"DELETE",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/documents/${encodeURIComponent(documentId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Search ───────────────────────────────────────────────────────

	/** Search an index (requires a key with search scope as well). */
	async search(indexId: string, params: SearchParams = {}): Promise<SearchResult> {
		return request<SearchResult>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/search`,
			params,
			this.fetchImpl,
		);
	}

	// ── API Key operations ───────────────────────────────────────────

	/** List all API keys in the project. */
	async listKeys(): Promise<ApiKey[]> {
		return request<ApiKey[]>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/projects/${encodeURIComponent(this.projectId)}/keys`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Create a new API key for the project. */
	async createKey(input: CreateKeyInput): Promise<CreateKeyResult> {
		return request<CreateKeyResult>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v1/projects/${encodeURIComponent(this.projectId)}/keys`,
			input,
			this.fetchImpl,
		);
	}

	/** Revoke an API key by its ID. */
	async revokeKey(keyId: string): Promise<{ id: string; revoked: boolean }> {
		return request(
			this.baseUrl,
			this.apiKey,
			"DELETE",
			`/api/v1/keys/${encodeURIComponent(keyId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Analytics ────────────────────────────────────────────────────

	/** Get aggregated search analytics for the project. */
	async getAnalytics(query?: AnalyticsQuery): Promise<AnalyticsResult> {
		const params = query?.period ? `?period=${query.period}` : "";
		return request<AnalyticsResult>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/projects/${encodeURIComponent(this.projectId)}/analytics${params}`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Get raw usage data for the project. */
	async getUsage(windowDays?: number): Promise<{ since: string; rows: UsageRow[] }> {
		const params = windowDays ? `?windowDays=${windowDays}` : "";
		return request(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/projects/${encodeURIComponent(this.projectId)}/usage${params}`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Synonym operations ───────────────────────────────────────────

	/** List synonyms for an index. */
	async listSynonyms(indexId: string): Promise<Synonym[]> {
		return request<Synonym[]>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/synonyms`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Create a synonym for an index. */
	async createSynonym(indexId: string, input: CreateSynonymInput): Promise<Synonym> {
		return request<Synonym>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/synonyms`,
			input,
			this.fetchImpl,
		);
	}

	/** Upsert (replace) synonyms for an index. */
	async upsertSynonyms(indexId: string, synonyms: CreateSynonymInput[]): Promise<Synonym[]> {
		return request<Synonym[]>(
			this.baseUrl,
			this.apiKey,
			"PUT",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/synonyms`,
			synonyms,
			this.fetchImpl,
		);
	}

	/** Delete a synonym by its ID. */
	async deleteSynonym(indexId: string, synonymId: string): Promise<{ deleted: boolean }> {
		return request(
			this.baseUrl,
			this.apiKey,
			"DELETE",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/synonyms/${encodeURIComponent(synonymId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Curation operations ──────────────────────────────────────────

	/** List curations for an index. */
	async listCurations(indexId: string): Promise<Curation[]> {
		return request<Curation[]>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/curations`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Create a curation for an index. */
	async createCuration(indexId: string, input: CreateCurationInput): Promise<Curation> {
		return request<Curation>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/curations`,
			input,
			this.fetchImpl,
		);
	}

	/** Upsert (replace) curations for an index. */
	async upsertCurations(indexId: string, curations: CreateCurationInput[]): Promise<Curation[]> {
		return request<Curation[]>(
			this.baseUrl,
			this.apiKey,
			"PUT",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/curations`,
			curations,
			this.fetchImpl,
		);
	}

	/** Delete a curation by its ID. */
	async deleteCuration(indexId: string, curationId: string): Promise<{ deleted: boolean }> {
		return request(
			this.baseUrl,
			this.apiKey,
			"DELETE",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/curations/${encodeURIComponent(curationId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Sorting field operations ─────────────────────────────────────

	/** List sorting fields for an index. */
	async listSortingFields(indexId: string): Promise<SortingField[]> {
		return request<SortingField[]>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/sorting`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Add a sorting field to an index. */
	async createSortingField(indexId: string, input: CreateSortingFieldInput): Promise<SortingField> {
		return request<SortingField>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/sorting`,
			input,
			this.fetchImpl,
		);
	}

	/** Replace all sorting fields for an index. */
	async replaceSortingFields(
		indexId: string,
		fields: CreateSortingFieldInput[],
	): Promise<SortingField[]> {
		return request<SortingField[]>(
			this.baseUrl,
			this.apiKey,
			"PUT",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/sorting`,
			fields,
			this.fetchImpl,
		);
	}

	/** Remove a sorting field from an index. */
	async deleteSortingField(indexId: string, fieldName: string): Promise<{ deleted: boolean }> {
		return request(
			this.baseUrl,
			this.apiKey,
			"DELETE",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/sorting/${encodeURIComponent(fieldName)}`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Facet operations ─────────────────────────────────────────────

	/** List facet fields for an index. */
	async listFacets(indexId: string): Promise<{ fields: FacetField[] }> {
		return request<{ fields: FacetField[] }>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v1/indexes/${encodeURIComponent(indexId)}/facets`,
			undefined,
			this.fetchImpl,
		);
	}
}
