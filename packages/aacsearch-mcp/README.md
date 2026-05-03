# AACsearch MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for **AACsearch** — the search-as-a-service platform in this monorepo.  
AI agents (Claude Code, Cursor, etc.) can **search documents, list indexes, upsert documents, and get search statistics** via the MCP stdio transport.

## Quick Start

```bash
# Build
pnpm --filter @repo/aacsearch-mcp build

# Type-check
pnpm --filter @repo/aacsearch-mcp type-check
```

## Tools (18 total)

| Tool                       | Description                                          | Required API Key Scope |
| -------------------------- | ---------------------------------------------------- | ---------------------- |
| `search`                   | Search documents in a public index                   | `search` or scoped     |
| `list_indexes`             | List all indexes in a project                        | `admin`                |
| `upsert_document`          | Upsert a single document to an index                 | `ingest`               |
| `search_stats`             | Get search usage statistics for a project            | `admin`                |
| `create_index`             | Create a new search index with schema                | `admin`                |
| `update_index`             | Update index displayName or enabled status           | `admin`                |
| `delete_index`             | Permanently delete a search index                    | `admin`                |
| `list_documents`           | List documents in an index with pagination/filtering | `search`               |
| `delete_document`          | Delete a single document from an index               | `ingest`               |
| `create_key`               | Create an API key with specific scopes               | `admin`                |
| `list_keys`                | List all API keys for a project                      | `admin`                |
| `revoke_key`               | Revoke an API key by ID                              | `admin`                |
| `get_recommendations`      | AI-powered product/search recommendations            | `admin`                |
| `track_event`              | Track search/conversion analytics events             | `search`               |
| `trigger_reindex`          | Trigger a full reindex of a search index             | `admin`                |
| `get_analytics`            | Search analytics metrics for a project               | `admin`                |
| `trigger_crawler`          | Start a web crawl job into a search index            | `admin`                |
| `list_connector_sync_jobs` | List all connector sync jobs for a project           | `admin`                |

### Tool Inputs

All tools require `baseUrl` (the AACsearch deployment URL) and `apiKey`.

- **`search`**: `baseUrl`, `apiKey`, `indexSlug`, `q` (query), optional `filterBy`, `perPage`, `page`
- **`list_indexes`**: `baseUrl`, `apiKey`, `projectId`
- **`upsert_document`**: `baseUrl`, `apiKey`, `indexId`, `documentId`, `document` (JSON object)
- **`search_stats`**: `baseUrl`, `apiKey`, `projectId`, optional `indexSlug`
- **`get_recommendations`**: `baseUrl`, `apiKey`, `type`, optional `userId`, `itemId`, `limit`
- **`track_event`**: `baseUrl`, `apiKey`, `type`, optional `sessionId`, `anonymousUserId`, `query`, `productId`, `position`, `locale`, `metadata`
- **`trigger_reindex`**: `baseUrl`, `apiKey`, `indexId`
- **`get_analytics`**: `baseUrl`, `apiKey`, `projectId`, optional `period`
- **`trigger_crawler`**: `baseUrl`, `apiKey`, `projectId`, `url`, `indexId`, optional `maxPages`, `selector`
- **`list_connector_sync_jobs`**: `baseUrl`, `apiKey`, `projectId`

## Client Configuration

### Claude Code

Add to your `~/.claude/settings.json` or project `.claude/settings.local.json`:

```json
{
	"mcpServers": {
		"aacsearch": {
			"command": "node",
			"args": ["/path/to/supastarter/packages/aacsearch-mcp/dist/index.js"]
		}
	}
}
```

Or via `pnpm` (if built):

```json
{
	"mcpServers": {
		"aacsearch": {
			"command": "pnpm",
			"args": ["--filter", "@repo/aacsearch-mcp", "exec", "node", "dist/index.js"]
		}
	}
}
```

### Cursor

In Cursor, go to **Settings → Features → MCP Servers** and add a new server:

- **Name**: `aacsearch`
- **Type**: `command`
- **Command**: `node /path/to/supastarter/packages/aacsearch-mcp/dist/index.js`

### Manual Test

You can test the server directly from the terminal:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"listTools"}' | node dist/index.js
```

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"callTool","params":{"name":"search","arguments":{"baseUrl":"https://your-deployment.com","apiKey":"ss_search_...","indexSlug":"products","q":"laptop"}}}' | node dist/index.js
```

## Development

```bash
# Watch mode (TypeScript)
pnpm --filter @repo/aacsearch-mcp exec tsx watch src/index.ts
```

## Architecture

The MCP server communicates via **JSON-RPC 2.0** over **stdin/stdout**.  
It calls the AACsearch **V1 REST API** using native `fetch` — no direct dependency on `@repo/api` or oRPC.

```
AI Agent ←→ [stdin/stdout JSON-RPC] ←→ AACsearch MCP ←→ [HTTP fetch] ←→ AACsearch API
```
