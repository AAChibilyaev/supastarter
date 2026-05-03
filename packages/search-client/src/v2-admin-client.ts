/**
 * Server-side management client for the AACSearch v2 REST API.
 *
 * Requires an admin-scope API key (`aa_admin_*`). Never bundle in browser code.
 *
 * Usage:
 * ```ts
 * const admin = new V2AdminClient({
 *   baseUrl: "https://api.aacsearch.com",
 *   apiKey: "aa_admin_...",
 * });
 * ```
 */
import { request } from "./transport";
import type { ClientOptions } from "./types";
import type { components } from "./generated/v2-types";

export interface V2AdminClientOptions extends ClientOptions {
	// No projectId required at construction — passed per-method where needed
}

// ── Convenience types extracted from the generated spec ────────────────────

export type V2Project = components["schemas"]["Project"];
export type V2SearchIndex = components["schemas"]["SearchIndex"];
export type V2SearchField = components["schemas"]["SearchField"];
export type V2SearchRequest = components["schemas"]["SearchRequest"];
export type V2Error = components["schemas"]["V2Error"];

export interface V2CreateProjectInput {
	name: string;
	slug: string;
	logo?: string;
}

export interface V2CreateIndexInput {
	slug: string;
	displayName: string;
	fields: V2SearchField[];
	defaultSortingField?: string;
}

export interface V2UpdateIndexInput {
	displayName?: string;
	enabled?: boolean;
	defaultSortingField?: string;
}

export interface V2ListDocumentsOptions {
	cursor?: string;
	perPage?: number;
	filterBy?: string;
}

export interface V2UpsertDocumentsInput {
	documents: Record<string, unknown>[];
	action?: "upsert" | "create" | "update";
}

export interface V2BatchDeleteInput {
	ids: string[];
}

export interface V2ExportDocumentsOptions {
	format?: "jsonl" | "json";
	filterBy?: string;
}

export interface V2CreateKeyInput {
	description: string;
	scopes: ("admin" | "ingest" | "search")[];
	rateLimitPerMinute?: number;
	allowedOrigins?: string[];
}

export interface V2CreateSynonymInput {
	root: string;
	synonyms: string[];
	locale?: string;
}

export class V2AdminClient {
	private readonly baseUrl: string;
	private readonly apiKey: string;
	private readonly fetchImpl: typeof fetch | undefined;

	constructor(opts: V2AdminClientOptions) {
		if (!opts.baseUrl) throw new Error("V2AdminClient: baseUrl is required");
		if (!opts.apiKey) throw new Error("V2AdminClient: apiKey is required");
		this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
		this.apiKey = opts.apiKey;
		this.fetchImpl = opts.fetchImpl;
	}

	// ── Project operations ───────────────────────────────────────────

	/** Get current project details. */
	async getProject(): Promise<V2Project> {
		return request<V2Project>(
			this.baseUrl,
			this.apiKey,
			"GET",
			"/api/v2/projects",
			undefined,
			this.fetchImpl,
		);
	}

	/** Create a new project (organization). */
	async createProject(data: V2CreateProjectInput): Promise<V2Project> {
		return request<V2Project>(
			this.baseUrl,
			this.apiKey,
			"POST",
			"/api/v2/projects",
			data,
			this.fetchImpl,
		);
	}

	/** Get project by ID. */
	async getProjectById(projectId: string): Promise<V2Project> {
		return request<V2Project>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/projects/${encodeURIComponent(projectId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Index operations ─────────────────────────────────────────────

	/** List all indexes in a project. */
	async listIndexes(projectId: string): Promise<V2SearchIndex[]> {
		return request<V2SearchIndex[]>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/projects/${encodeURIComponent(projectId)}/indexes`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Create a new search index. */
	async createIndex(
		projectId: string,
		data: V2CreateIndexInput,
	): Promise<V2SearchIndex> {
		return request<V2SearchIndex>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v2/projects/${encodeURIComponent(projectId)}/indexes`,
			data,
			this.fetchImpl,
		);
	}

	/** Get a single index by its ID. */
	async getIndex(indexId: string): Promise<V2SearchIndex> {
		return request<V2SearchIndex>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/indexes/${encodeURIComponent(indexId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Update index metadata. */
	async updateIndex(
		indexId: string,
		data: V2UpdateIndexInput,
	): Promise<V2SearchIndex> {
		return request<V2SearchIndex>(
			this.baseUrl,
			this.apiKey,
			"PATCH",
			`/api/v2/indexes/${encodeURIComponent(indexId)}`,
			data,
			this.fetchImpl,
		);
	}

	/** Delete an index. */
	async deleteIndex(indexId: string): Promise<void> {
		return request<void>(
			this.baseUrl,
			this.apiKey,
			"DELETE",
			`/api/v2/indexes/${encodeURIComponent(indexId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Get index statistics. */
	async getIndexStats(indexId: string): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/stats`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Document operations ──────────────────────────────────────────

	/** List documents with cursor-based pagination. */
	async listDocuments(
		indexId: string,
		opts?: V2ListDocumentsOptions,
	): Promise<unknown> {
		const params = new URLSearchParams();
		if (opts?.cursor) params.set("cursor", opts.cursor);
		if (opts?.perPage) params.set("perPage", String(opts.perPage));
		if (opts?.filterBy) params.set("filterBy", opts.filterBy);
		const qs = params.toString();
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/documents${qs ? `?${qs}` : ""}`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Batch upsert documents. */
	async upsertDocuments(
		indexId: string,
		docs: Record<string, unknown>[],
		action?: "upsert" | "create" | "update",
	): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/documents`,
			{ documents: docs, action: action ?? "upsert" },
			this.fetchImpl,
		);
	}

	/** Get a single document by ID. */
	async getDocument(
		indexId: string,
		documentId: string,
	): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/documents/${encodeURIComponent(documentId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Upsert a single document. */
	async upsertDocument(
		indexId: string,
		documentId: string,
		data: Record<string, unknown>,
	): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"PUT",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/documents/${encodeURIComponent(documentId)}`,
			data,
			this.fetchImpl,
		);
	}

	/** Delete a single document. */
	async deleteDocument(
		indexId: string,
		documentId: string,
	): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"DELETE",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/documents/${encodeURIComponent(documentId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Batch delete documents by IDs. */
	async batchDeleteDocuments(
		indexId: string,
		ids: string[],
	): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/documents:batchDelete`,
			{ ids },
			this.fetchImpl,
		);
	}

	/** Export documents as JSONL or JSON. */
	async exportDocuments(
		indexId: string,
		format?: "jsonl" | "json",
	): Promise<unknown> {
		const params = format ? `?format=${format}` : "";
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/documents:export${params}`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── API Key operations ───────────────────────────────────────────

	/** List all API keys in the project. */
	async listKeys(projectId: string): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/projects/${encodeURIComponent(projectId)}/keys`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Create a new API key for the project. */
	async createKey(
		projectId: string,
		data: V2CreateKeyInput,
	): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v2/projects/${encodeURIComponent(projectId)}/keys`,
			data,
			this.fetchImpl,
		);
	}

	/** Revoke an API key by its ID. */
	async revokeKey(keyId: string): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"DELETE",
			`/api/v2/keys/${encodeURIComponent(keyId)}`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Synonym operations ───────────────────────────────────────────

	/** List synonyms for an index. */
	async listSynonyms(indexId: string): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/synonyms`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Create a synonym for an index. */
	async createSynonym(
		indexId: string,
		data: V2CreateSynonymInput,
	): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"POST",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/synonyms`,
			data,
			this.fetchImpl,
		);
	}

	/** Upsert (replace) synonyms for an index. */
	async upsertSynonyms(
		indexId: string,
		data: V2CreateSynonymInput[],
	): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"PUT",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/synonyms`,
			data,
			this.fetchImpl,
		);
	}

	/** Delete a synonym by its ID. */
	async deleteSynonym(
		indexId: string,
		synonymId: string,
	): Promise<unknown> {
		const params = new URLSearchParams({ synonymId });
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"DELETE",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/synonyms?${params.toString()}`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Curation operations ──────────────────────────────────────────

	/** List curations for an index. */
	async listCurations(indexId: string): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/indexes/${encodeURIComponent(indexId)}/curations`,
			undefined,
			this.fetchImpl,
		);
	}

	// ── Analytics ────────────────────────────────────────────────────

	/** Get aggregated search analytics for the project. */
	async getAnalytics(projectId: string): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/projects/${encodeURIComponent(projectId)}/analytics`,
			undefined,
			this.fetchImpl,
		);
	}

	/** Get raw usage data for the project. */
	async getUsage(projectId: string): Promise<unknown> {
		return request<unknown>(
			this.baseUrl,
			this.apiKey,
			"GET",
			`/api/v2/projects/${encodeURIComponent(projectId)}/usage`,
			undefined,
			this.fetchImpl,
		);
	}
}
