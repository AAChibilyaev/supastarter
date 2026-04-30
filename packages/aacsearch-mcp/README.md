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

## Tools

| Tool              | Description                               | Required API Key Scope |
| ----------------- | ----------------------------------------- | ---------------------- |
| `search`          | Search documents in a public index        | `search` or scoped     |
| `list_indexes`    | List all indexes in a project             | `admin`                |
| `upsert_document` | Upsert a single document to an index      | `ingest`               |
| `search_stats`    | Get search usage statistics for a project | `admin`                |

### Tool Inputs

All tools require `baseUrl` (the AACsearch deployment URL) and `apiKey`.

- **`search`**: `baseUrl`, `apiKey`, `indexSlug`, `q` (query), optional `filterBy`, `perPage`, `page`
- **`list_indexes`**: `baseUrl`, `apiKey`, `projectId`
- **`upsert_document`**: `baseUrl`, `apiKey`, `indexId`, `documentId`, `document` (JSON object)
- **`search_stats`**: `baseUrl`, `apiKey`, `projectId`, optional `indexSlug`

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
