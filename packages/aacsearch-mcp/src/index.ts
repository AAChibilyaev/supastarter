#!/usr/bin/env node

/**
 * AACsearch MCP Server
 *
 * Implements the Model Context Protocol over stdio JSON-RPC.
 * Allows AI agents (Cursor, Claude Code, etc.) to search documents,
 * list indexes, upsert documents, and get search stats via the
 * AACsearch V1 REST API.
 *
 * Protocol:
 *   - listTools  → returns tool definitions
 *   - callTool   → executes a tool and returns a result
 *   - ping       → responds with { pong: true }
 *
 * Each tool accepts { baseUrl, apiKey, ... } — the MCP client
 * supplies the server URL and API key per request.
 */

import { z } from "zod";

// ── Types ────────────────────────────────────────────────────────────────

interface JsonRpcRequest {
	jsonrpc: "2.0";
	id: string | number | null;
	method: string;
	params?: unknown;
}

interface JsonRpcSuccess {
	jsonrpc: "2.0";
	id: string | number | null;
	result: unknown;
}

interface JsonRpcError {
	jsonrpc: "2.0";
	id: string | number | null;
	error: {
		code: number;
		message: string;
		data?: unknown;
	};
}

type JsonRpcMessage = JsonRpcRequest | JsonRpcSuccess | JsonRpcError;

// ── MCP tool input schemas (Zod v4) ─────────────────────────────────────

const searchInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	indexSlug: z.string().min(1, "indexSlug is required"),
	q: z.string().default("*"),
	filterBy: z.string().optional(),
	perPage: z.number().int().min(1).max(100).optional(),
	page: z.number().int().min(1).max(1000).optional(),
});

const listIndexesInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	projectId: z.string().optional(),
});

const upsertDocumentInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	indexId: z.string().min(1, "indexId is required"),
	documentId: z.string().min(1).max(256, "documentId must be max 256 chars"),
	document: z.record(z.string(), z.unknown()),
});

const searchStatsInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	projectId: z.string().min(1, "projectId is required"),
	indexSlug: z.string().optional(),
});

const createIndexInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	projectId: z.string().min(1, "projectId is required"),
	slug: z.string().min(1).max(64),
	displayName: z.string().min(1).max(120),
	fields: z
		.array(
			z.object({
				name: z.string().min(1),
				type: z.enum([
					"string",
					"int32",
					"int64",
					"float",
					"bool",
					"string[]",
					"int32[]",
					"int64[]",
					"float[]",
					"bool[]",
					"geopoint",
					"geopoint[]",
					"object",
					"object[]",
					"string*",
					"image",
				]),
				facet: z.boolean().optional(),
				optional: z.boolean().optional(),
				index: z.boolean().optional(),
				sort: z.boolean().optional(),
				locale: z.string().optional(),
				numDim: z.number().int().positive().optional(),
			}),
		)
		.min(1),
	defaultSortingField: z.string().optional(),
});

const updateIndexInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	indexId: z.string().min(1, "indexId is required"),
	displayName: z.string().min(1).max(120).optional(),
	enabled: z.boolean().optional(),
});

const deleteIndexInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	indexId: z.string().min(1, "indexId is required"),
});

const deleteDocumentInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	indexId: z.string().min(1, "indexId is required"),
	documentId: z.string().min(1, "documentId is required"),
});

const listDocumentsInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	indexId: z.string().min(1, "indexId is required"),
	page: z.number().int().min(1).optional(),
	perPage: z.number().int().min(1).max(100).optional(),
	q: z.string().optional(),
	filterBy: z.string().optional(),
});

const createKeyInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	projectId: z.string().min(1, "projectId is required"),
	indexSlug: z.string().min(1).max(64),
	name: z.string().min(1).max(120),
	scopes: z
		.array(z.enum(["admin", "ingest", "search"]))
		.min(1),
	allowedOrigins: z.array(z.string().min(3).max(255)).max(20).optional(),
	rateLimitPerMinute: z.number().int().min(1).max(60_000).optional(),
	expiresAt: z.string().datetime().optional(),
});

const listKeysInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	projectId: z.string().min(1, "projectId is required"),
});

const revokeKeyInputSchema = z.object({
	baseUrl: z.string().min(1, "baseUrl is required"),
	apiKey: z.string().min(1, "apiKey is required"),
	keyId: z.string().min(1, "keyId is required"),
});

// ── MCP tool definitions ────────────────────────────────────────────────

interface ToolDefinition {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

const tools: ToolDefinition[] = [
	{
		name: "search",
		description:
			"Search documents in a search index. Returns hits, total found, pagination info, and facet counts. Requires a search-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description:
						"Base URL of the AACsearch deployment (e.g. https://app.example.com)",
				},
				apiKey: {
					type: "string",
					description:
						"Search-scoped API key (ss_search_...) or scoped token (ss_scoped_...)",
				},
				indexSlug: {
					type: "string",
					description: "Public index slug to search against",
				},
				q: {
					type: "string",
					description: "Search query string (default: *)",
					default: "*",
				},
				filterBy: {
					type: "string",
					description: "Optional filter expression (Typesense filter-by syntax)",
				},
				perPage: {
					type: "number",
					description: "Results per page (1-100)",
				},
				page: {
					type: "number",
					description: "Page number (1-1000)",
				},
			},
			required: ["baseUrl", "apiKey", "indexSlug"],
		},
	},
	{
		name: "list_indexes",
		description:
			"List all search indexes for a project/organization. Returns slug, displayName, version, and status for each index. Requires an admin-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description: "Base URL of the AACsearch deployment",
				},
				apiKey: {
					type: "string",
					description: "Admin-scoped API key (aa_admin_...) or scoped token",
				},
				projectId: {
					type: "string",
					description:
						"Project/organization ID (optional — if omitted, derived from the API key)",
				},
			},
			required: ["baseUrl", "apiKey"],
		},
	},
	{
		name: "upsert_document",
		description:
			"Upsert a single document into a search index. The document is enqueued for asynchronous indexing. Returns { id, queued: true } on success. Requires an ingest-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description: "Base URL of the AACsearch deployment",
				},
				apiKey: {
					type: "string",
					description: "Ingest-scoped API key (aa_ingest_...)",
				},
				indexId: {
					type: "string",
					description: "Index ID (not slug) — the UUID of the index",
				},
				documentId: {
					type: "string",
					description: "Unique document ID (used as the Typesense document id)",
				},
				document: {
					type: "object",
					description: "Document fields as a JSON object (id is set automatically)",
					additionalProperties: true,
				},
			},
			required: ["baseUrl", "apiKey", "indexId", "documentId", "document"],
		},
	},
	{
		name: "search_stats",
		description:
			"Get search usage statistics for a project. Returns total searches, documents indexed, and usage over the lookback period. Requires an admin-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description: "Base URL of the AACsearch deployment",
				},
				apiKey: {
					type: "string",
					description: "Admin-scoped API key",
				},
				projectId: {
					type: "string",
					description: "Project/organization ID",
				},
				indexSlug: {
					type: "string",
					description: "Optional index slug to filter stats by a specific index",
				},
			},
			required: ["baseUrl", "apiKey", "projectId"],
		},
	},
	{
		name: "create_index",
		description:
			"Create a new search index with a schema. Requires slug, displayName, and an array of field definitions. Requires an admin-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description: "Base URL of the AACsearch deployment",
				},
				apiKey: {
					type: "string",
					description: "Admin-scoped API key",
				},
				projectId: {
					type: "string",
					description: "Project/organization ID",
				},
				slug: {
					type: "string",
					description: "Unique index slug (lowercase, hyphens)",
				},
				displayName: {
					type: "string",
					description: "Human-readable display name",
				},
				fields: {
					type: "array",
					description: "Array of field definitions (name, type, facet, optional, index, sort)",
					items: { type: "object" },
				},
				defaultSortingField: {
					type: "string",
					description: "Optional default field to sort results by",
				},
			},
			required: ["baseUrl", "apiKey", "projectId", "slug", "displayName", "fields"],
		},
	},
	{
		name: "update_index",
		description:
			"Update an existing search index (displayName, enabled status). Requires an admin-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description: "Base URL of the AACsearch deployment",
				},
				apiKey: {
					type: "string",
					description: "Admin-scoped API key",
				},
				indexId: {
					type: "string",
					description: "Index ID (UUID)",
				},
				displayName: {
					type: "string",
					description: "Optional new display name",
				},
				enabled: {
					type: "boolean",
					description: "Optional enable/disable the index",
				},
			},
			required: ["baseUrl", "apiKey", "indexId"],
		},
	},
	{
		name: "delete_index",
		description:
			"Permanently delete a search index and its Typesense collection. Requires an admin-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description: "Base URL of the AACsearch deployment",
				},
				apiKey: {
					type: "string",
					description: "Admin-scoped API key",
				},
				indexId: {
					type: "string",
					description: "Index ID (UUID) to delete",
				},
			},
			required: ["baseUrl", "apiKey", "indexId"],
		},
	},
	{
		name: "delete_document",
		description:
			"Delete a single document from a search index by its document ID. Requires an ingest-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description: "Base URL of the AACsearch deployment",
				},
				apiKey: {
					type: "string",
					description: "Ingest-scoped API key",
				},
				indexId: {
					type: "string",
					description: "Index ID (UUID)",
				},
				documentId: {
					type: "string",
					description: "Document ID to delete",
				},
			},
			required: ["baseUrl", "apiKey", "indexId", "documentId"],
		},
	},
	{
		name: "list_documents",
		description:
			"List documents in a search index with optional pagination, search query, and filter. Returns documents, total count, and pagination info. Requires a search-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description: "Base URL of the AACsearch deployment",
				},
				apiKey: {
					type: "string",
					description: "Search-scoped API key",
				},
				indexId: {
					type: "string",
					description: "Index ID (UUID)",
				},
				page: {
					type: "number",
					description: "Page number (default: 1)",
				},
				perPage: {
					type: "number",
					description: "Results per page (1-100, default: 20)",
				},
				q: {
					type: "string",
					description: "Search query (default: * for all documents)",
				},
				filterBy: {
					type: "string",
					description: "Optional filter expression (Typesense filter-by syntax)",
				},
			},
			required: ["baseUrl", "apiKey", "indexId"],
		},
	},
	{
		name: "create_key",
		description:
			"Create a new API key for a search index with specified scopes (admin, ingest, search) and optional restrictions. Returns the key ID, prefix, and rawKey (shown once). Requires an admin-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description: "Base URL of the AACsearch deployment",
				},
				apiKey: {
					type: "string",
					description: "Admin-scoped API key to authorize this operation",
				},
				projectId: {
					type: "string",
					description: "Project/organization ID",
				},
				indexSlug: {
					type: "string",
					description: "Slug of the index to create the key for",
				},
				name: {
					type: "string",
					description: "Human-readable name for the key",
				},
				scopes: {
					type: "array",
					description: "API key scopes: admin, ingest, or search",
					items: { type: "string" },
				},
				allowedOrigins: {
					type: "array",
					description: "Optional CORS origin allowlist",
					items: { type: "string" },
				},
				rateLimitPerMinute: {
					type: "number",
					description: "Optional rate limit per minute (1-60000)",
				},
				expiresAt: {
					type: "string",
					description: "Optional ISO datetime for key expiration",
				},
			},
			required: ["baseUrl", "apiKey", "projectId", "indexSlug", "name", "scopes"],
		},
	},
	{
		name: "list_keys",
		description:
			"List all API keys for a project, grouped by index. Returns key ID, name, prefix, scopes, and expiry for each key. Requires an admin-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description: "Base URL of the AACsearch deployment",
				},
				apiKey: {
					type: "string",
					description: "Admin-scoped API key",
				},
				projectId: {
					type: "string",
					description: "Project/organization ID",
				},
			},
			required: ["baseUrl", "apiKey", "projectId"],
		},
	},
	{
		name: "revoke_key",
		description:
			"Revoke an API key by its ID. Once revoked, the key can no longer be used for any API calls. Requires an admin-scoped API key.",
		inputSchema: {
			type: "object",
			properties: {
				baseUrl: {
					type: "string",
					description: "Base URL of the AACsearch deployment",
				},
				apiKey: {
					type: "string",
					description: "Admin-scoped API key",
				},
				keyId: {
					type: "string",
					description: "Key ID (UUID) to revoke",
				},
			},
			required: ["baseUrl", "apiKey", "keyId"],
		},
	},
];

// ── Helper: fetch with auth ──────────────────────────────────────────────

/**
 * Build the authorization header value from the apiKey.
 * If the key doesn't already start with "Bearer ", prepend it.
 */
function authHeader(apiKey: string): string {
	return apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`;
}

/**
 * Perform an HTTP fetch to a V1 REST API endpoint with auth and error handling.
 * Returns the MCP content result object.
 */
async function v1Fetch(
	method: string,
	url: string,
	apiKey: string,
	body?: Record<string, unknown>,
): Promise<unknown> {
	try {
		const headers: Record<string, string> = { Authorization: authHeader(apiKey) };
		const opts: RequestInit = { method, headers };
		if (body !== undefined) {
			headers["Content-Type"] = "application/json";
			opts.body = JSON.stringify(body);
		}

		const response = await fetch(url, opts);
		const text = await response.text();
		let data: unknown;
		try {
			data = JSON.parse(text);
		} catch {
			data = text;
		}

		if (!response.ok) {
			return {
				content: [
					{
						type: "text",
						text: `${method} ${url} failed (${response.status}): ${JSON.stringify(data)}`,
					},
				],
				isError: true,
			};
		}

		return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: `Network error: ${error instanceof Error ? error.message : String(error)}`,
				},
			],
			isError: true,
		};
	}
}

/**
 * Extract baseUrl and apiKey from validated params, build a V1 URL path.
 */
function v1Url(baseUrl: string, path: string): string {
	return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

// ── Tool implementations ────────────────────────────────────────────────

/**
 * Search documents via the public search endpoint.
 * POST /api/search/public/:slug
 */
async function toolSearch(params: Record<string, unknown>): Promise<unknown> {
	const parsed = searchInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, indexSlug, q, filterBy, perPage, page } = parsed.data;
	const url = v1Url(baseUrl, `/api/search/public/${encodeURIComponent(indexSlug)}`);

	const body: Record<string, unknown> = { q };
	if (filterBy !== undefined) body.filterBy = filterBy;
	if (perPage !== undefined) body.perPage = perPage;
	if (page !== undefined) body.page = page;

	return v1Fetch("POST", url, apiKey, body);
}

/**
 * List indexes via the V1 REST API.
 * GET /v1/projects/:projectId/indexes
 */
async function toolListIndexes(params: Record<string, unknown>): Promise<unknown> {
	const parsed = listIndexesInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, projectId } = parsed.data;

	if (!projectId) {
		return {
			content: [
				{
					type: "text",
					text: "projectId is required. Call list_indexes with a projectId to list indexes for that project.",
				},
			],
			isError: true,
		};
	}

	const url = v1Url(baseUrl, `/v1/projects/${encodeURIComponent(projectId)}/indexes`);
	return v1Fetch("GET", url, apiKey);
}

/**
 * Upsert a single document via the V1 REST API.
 * PUT /v1/indexes/:indexId/documents/:documentId
 */
async function toolUpsertDocument(params: Record<string, unknown>): Promise<unknown> {
	const parsed = upsertDocumentInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, indexId, documentId, document } = parsed.data;
	const url = v1Url(
		baseUrl,
		`/v1/indexes/${encodeURIComponent(indexId)}/documents/${encodeURIComponent(documentId)}`,
	);
	return v1Fetch("PUT", url, apiKey, document);
}

/**
 * Get search usage stats via the V1 REST API.
 * GET /v1/projects/:projectId/usage
 */
async function toolSearchStats(params: Record<string, unknown>): Promise<unknown> {
	const parsed = searchStatsInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, projectId } = parsed.data;
	const url = v1Url(baseUrl, `/v1/projects/${encodeURIComponent(projectId)}/usage`);
	return v1Fetch("GET", url, apiKey);
}

/**
 * List documents in an index.
 * GET /v1/indexes/:indexId/documents
 */
async function toolListDocuments(params: Record<string, unknown>): Promise<unknown> {
	const parsed = listDocumentsInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, indexId, page, perPage, q, filterBy } = parsed.data;
	const searchParams = new URLSearchParams();
	if (page !== undefined) searchParams.set("page", String(page));
	if (perPage !== undefined) searchParams.set("per_page", String(perPage));
	if (q !== undefined) searchParams.set("q", q);
	if (filterBy !== undefined) searchParams.set("filter_by", filterBy);
	const query = searchParams.toString();
	const url = v1Url(
		baseUrl,
		`/v1/indexes/${encodeURIComponent(indexId)}/documents${query ? `?${query}` : ""}`,
	);
	return v1Fetch("GET", url, apiKey);
}

/**
 * Delete a single document from an index.
 * DELETE /v1/indexes/:indexId/documents/:documentId
 */
async function toolDeleteDocument(params: Record<string, unknown>): Promise<unknown> {
	const parsed = deleteDocumentInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, indexId, documentId } = parsed.data;
	const url = v1Url(
		baseUrl,
		`/v1/indexes/${encodeURIComponent(indexId)}/documents/${encodeURIComponent(documentId)}`,
	);
	return v1Fetch("DELETE", url, apiKey);
}

/**
 * Create a new search index.
 * POST /v1/projects/:projectId/indexes
 */
async function toolCreateIndex(params: Record<string, unknown>): Promise<unknown> {
	const parsed = createIndexInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, projectId, slug, displayName, fields, defaultSortingField } = parsed.data;
	const url = v1Url(baseUrl, `/v1/projects/${encodeURIComponent(projectId)}/indexes`);

	const body: Record<string, unknown> = { slug, displayName, fields };
	if (defaultSortingField !== undefined) body.defaultSortingField = defaultSortingField;

	return v1Fetch("POST", url, apiKey, body);
}

/**
 * Update an existing search index (displayName, enabled).
 * PATCH /v1/indexes/:indexId
 */
async function toolUpdateIndex(params: Record<string, unknown>): Promise<unknown> {
	const parsed = updateIndexInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, indexId, displayName, enabled } = parsed.data;
	const url = v1Url(baseUrl, `/v1/indexes/${encodeURIComponent(indexId)}`);

	const body: Record<string, unknown> = {};
	if (displayName !== undefined) body.displayName = displayName;
	if (enabled !== undefined) body.enabled = enabled;

	return v1Fetch("PATCH", url, apiKey, body);
}

/**
 * Delete a search index.
 * DELETE /v1/indexes/:indexId
 */
async function toolDeleteIndex(params: Record<string, unknown>): Promise<unknown> {
	const parsed = deleteIndexInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, indexId } = parsed.data;
	const url = v1Url(baseUrl, `/v1/indexes/${encodeURIComponent(indexId)}`);
	return v1Fetch("DELETE", url, apiKey);
}

/**
 * Create a new API key.
 * POST /v1/projects/:projectId/keys
 */
async function toolCreateKey(params: Record<string, unknown>): Promise<unknown> {
	const parsed = createKeyInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, projectId, indexSlug, name, scopes, allowedOrigins, rateLimitPerMinute, expiresAt } =
		parsed.data;
	const url = v1Url(baseUrl, `/v1/projects/${encodeURIComponent(projectId)}/keys`);

	const body: Record<string, unknown> = { indexSlug, name, scopes };
	if (allowedOrigins !== undefined) body.allowedOrigins = allowedOrigins;
	if (rateLimitPerMinute !== undefined) body.rateLimitPerMinute = rateLimitPerMinute;
	if (expiresAt !== undefined) body.expiresAt = expiresAt;

	return v1Fetch("POST", url, apiKey, body);
}

/**
 * List API keys for a project.
 * GET /v1/projects/:projectId/keys
 */
async function toolListKeys(params: Record<string, unknown>): Promise<unknown> {
	const parsed = listKeysInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, projectId } = parsed.data;
	const url = v1Url(baseUrl, `/v1/projects/${encodeURIComponent(projectId)}/keys`);
	return v1Fetch("GET", url, apiKey);
}

/**
 * Revoke an API key by its ID.
 * DELETE /v1/keys/:keyId
 */
async function toolRevokeKey(params: Record<string, unknown>): Promise<unknown> {
	const parsed = revokeKeyInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [{ type: "text", text: `Invalid input: ${JSON.stringify(parsed.error.issues)}` }],
			isError: true,
		};
	}

	const { baseUrl, apiKey, keyId } = parsed.data;
	const url = v1Url(baseUrl, `/v1/keys/${encodeURIComponent(keyId)}`);
	return v1Fetch("DELETE", url, apiKey);
}

// ── Tool dispatch ───────────────────────────────────────────────────────

type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;

const toolHandlers: Record<string, ToolHandler> = {
	search: toolSearch,
	list_indexes: toolListIndexes,
	upsert_document: toolUpsertDocument,
	search_stats: toolSearchStats,
	create_index: toolCreateIndex,
	update_index: toolUpdateIndex,
	delete_index: toolDeleteIndex,
	delete_document: toolDeleteDocument,
	list_documents: toolListDocuments,
	create_key: toolCreateKey,
	list_keys: toolListKeys,
	revoke_key: toolRevokeKey,
};

// ── MCP message handler ─────────────────────────────────────────────────

function sendMessage(msg: JsonRpcMessage): void {
	const json = JSON.stringify(msg);
	process.stdout.write(json + "\n");
}

function handleError(
	id: string | number | null,
	code: number,
	message: string,
	data?: unknown,
): void {
	const error: JsonRpcError = {
		jsonrpc: "2.0",
		id,
		error: { code, message, data },
	};
	sendMessage(error);
}

/**
 * Handle an incoming JSON-RPC request.
 */
async function handleRequest(req: JsonRpcRequest): Promise<void> {
	const { id, method, params } = req;

	switch (method) {
		case "ping": {
			sendMessage({
				jsonrpc: "2.0",
				id,
				result: { pong: true },
			});
			return;
		}

		case "listTools": {
			sendMessage({
				jsonrpc: "2.0",
				id,
				result: {
					tools: tools.map((t) => ({
						name: t.name,
						description: t.description,
						inputSchema: t.inputSchema,
					})),
				},
			});
			return;
		}

		case "callTool": {
			const p = (params as { name?: string; arguments?: Record<string, unknown> }) ?? {};
			const toolName = p.name;
			const toolArgs = p.arguments ?? {};

			const handler = toolHandlers[toolName ?? ""];
			if (!handler) {
				handleError(id, -32601, `Unknown tool: ${toolName}`);
				return;
			}

			try {
				const result = await handler(toolArgs);
				sendMessage({
					jsonrpc: "2.0",
					id,
					result,
				});
			} catch (error) {
				handleError(
					id,
					-32603,
					`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
			return;
		}

		default: {
			handleError(id, -32601, `Method not found: ${method}`);
			return;
		}
	}
}

// ── Main loop ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
	// Write a startup message to stderr (not stdout — stdout is for JSON-RPC)
	process.stderr.write("AACsearch MCP server started (stdio JSON-RPC)\n");
	process.stderr.write(`Registered ${tools.length} tools\n`);

	let buffer = "";

	process.stdin.setEncoding("utf-8");
	process.stdin.on("data", (chunk: string) => {
		buffer += chunk;
		const lines = buffer.split("\n");
		// Keep the last partial line in the buffer
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			let req: JsonRpcRequest;
			try {
				req = JSON.parse(trimmed) as JsonRpcRequest;
			} catch {
				handleError(null, -32700, "Parse error: invalid JSON");
				continue;
			}

			if (!req.jsonrpc || req.jsonrpc !== "2.0") {
				handleError(req.id ?? null, -32600, "Invalid Request: jsonrpc must be '2.0'");
				continue;
			}

			if (!req.method) {
				handleError(req.id ?? null, -32600, "Invalid Request: method is required");
				continue;
			}

			// Fire-and-forget each request (handle async)
			handleRequest(req).catch((err) => {
				process.stderr.write(`Error handling request: ${err}\n`);
			});
		}
	});

	process.stdin.on("end", () => {
		process.stderr.write("AACsearch MCP server: stdin closed, shutting down\n");
		process.exit(0);
	});
}

main().catch((err) => {
	process.stderr.write(`Fatal error: ${err}\n`);
	process.exit(1);
});
