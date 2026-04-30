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
];

// ── Tool implementations ────────────────────────────────────────────────

/**
 * Build the authorization header value from the apiKey.
 * If the key doesn't already start with "Bearer ", prepend it.
 */
function authHeader(apiKey: string): string {
	return apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`;
}

/**
 * Search documents via the public search endpoint.
 * POST /api/search/public/:slug
 */
async function toolSearch(params: Record<string, unknown>): Promise<unknown> {
	const parsed = searchInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [
				{
					type: "text",
					text: `Invalid input: ${JSON.stringify(parsed.error.issues)}`,
				},
			],
			isError: true,
		};
	}

	const { baseUrl, apiKey, indexSlug, q, filterBy, perPage, page } = parsed.data;
	const url = `${baseUrl.replace(/\/+$/, "")}/api/search/public/${encodeURIComponent(indexSlug)}`;

	try {
		const body: Record<string, unknown> = { q };
		if (filterBy !== undefined) body.filterBy = filterBy;
		if (perPage !== undefined) body.perPage = perPage;
		if (page !== undefined) body.page = page;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: authHeader(apiKey),
			},
			body: JSON.stringify(body),
		});

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
						text: `Search failed (${response.status}): ${JSON.stringify(data)}`,
					},
				],
				isError: true,
			};
		}

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(data, null, 2),
				},
			],
		};
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
 * List indexes via the V1 REST API.
 * GET /v1/projects/:projectId/indexes
 */
async function toolListIndexes(params: Record<string, unknown>): Promise<unknown> {
	const parsed = listIndexesInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [
				{
					type: "text",
					text: `Invalid input: ${JSON.stringify(parsed.error.issues)}`,
				},
			],
			isError: true,
		};
	}

	const { baseUrl, apiKey, projectId } = parsed.data;

	// If no projectId is provided, we first try to derive it.
	// The V1 API requires the projectId in the URL path.
	let pid = projectId;

	if (!pid) {
		// Attempt to get org from the key by calling the list endpoint
		// with a random project ID to get an error with context, or
		// fall back to instructing the user.
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

	const url = `${baseUrl.replace(/\/+$/, "")}/v1/projects/${encodeURIComponent(pid)}/indexes`;

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: authHeader(apiKey),
			},
		});

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
						text: `List indexes failed (${response.status}): ${JSON.stringify(data)}`,
					},
				],
				isError: true,
			};
		}

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(data, null, 2),
				},
			],
		};
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
 * Upsert a single document via the V1 REST API.
 * PUT /v1/indexes/:indexId/documents/:documentId
 */
async function toolUpsertDocument(params: Record<string, unknown>): Promise<unknown> {
	const parsed = upsertDocumentInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [
				{
					type: "text",
					text: `Invalid input: ${JSON.stringify(parsed.error.issues)}`,
				},
			],
			isError: true,
		};
	}

	const { baseUrl, apiKey, indexId, documentId, document } = parsed.data;
	const url = `${baseUrl.replace(/\/+$/, "")}/v1/indexes/${encodeURIComponent(indexId)}/documents/${encodeURIComponent(documentId)}`;

	try {
		const response = await fetch(url, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: authHeader(apiKey),
			},
			body: JSON.stringify(document),
		});

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
						text: `Upsert document failed (${response.status}): ${JSON.stringify(data)}`,
					},
				],
				isError: true,
			};
		}

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(data, null, 2),
				},
			],
		};
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
 * Get search usage stats via the V1 REST API.
 * GET /v1/projects/:projectId/usage
 */
async function toolSearchStats(params: Record<string, unknown>): Promise<unknown> {
	const parsed = searchStatsInputSchema.safeParse(params);
	if (!parsed.success) {
		return {
			content: [
				{
					type: "text",
					text: `Invalid input: ${JSON.stringify(parsed.error.issues)}`,
				},
			],
			isError: true,
		};
	}

	const { baseUrl, apiKey, projectId } = parsed.data;
	const url = `${baseUrl.replace(/\/+$/, "")}/v1/projects/${encodeURIComponent(projectId)}/usage`;

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: authHeader(apiKey),
			},
		});

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
						text: `Search stats failed (${response.status}): ${JSON.stringify(data)}`,
					},
				],
				isError: true,
			};
		}

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(data, null, 2),
				},
			],
		};
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

// ── Tool dispatch ───────────────────────────────────────────────────────

type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;

const toolHandlers: Record<string, ToolHandler> = {
	search: toolSearch,
	list_indexes: toolListIndexes,
	upsert_document: toolUpsertDocument,
	search_stats: toolSearchStats,
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
