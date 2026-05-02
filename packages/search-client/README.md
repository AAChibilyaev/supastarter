# @aacsearch/client

AACSearch TypeScript SDK — two clients for the AACSearch v1 REST API.

## Clients

| Client         | Scope       | Key Prefix    | Bundle-safe | Use Case                        |
| -------------- | ----------- | ------------- | ----------- | ------------------------------- |
| `SearchClient` | search-only | `ss_search_*` | ✅ Yes      | Browser widgets, frontend       |
| `AdminClient`  | full CRUD   | `aa_admin_*`  | ❌ No       | Server-side scripts, CLI, CI/CD |

> **Security rule**: never embed admin keys in browser code. Use `SearchClient` for frontend
> and proxy admin operations through your own backend.

## Installation

```bash
npm install @aacsearch/client
# or
pnpm add @aacsearch/client
```

## Usage

### SearchClient (browser-safe)

```ts
import { SearchClient } from "@aacsearch/client";

const client = new SearchClient({
	baseUrl: "https://app.aacsearch.com",
	apiKey: "ss_search_...",
	indexSlug: "products",
});

// Basic search
const result = await client.search({
	q: "running shoes",
	queryBy: "title,description",
	facetBy: "category,brand",
});
console.log(result.hits, result.found);

// Multi-search (federated)
const { results } = await client.multiSearch([
	{ q: "nike", queryBy: "title" },
	{ q: "adidas", queryBy: "title", filterBy: "in_stock:=true" },
]);
```

### AdminClient (server-side)

```ts
import { AdminClient } from "@aacsearch/client";

const admin = new AdminClient({
	baseUrl: "https://app.aacsearch.com",
	apiKey: "aa_admin_...",
	projectId: "org_xxx", // your organization ID
});

// Index management
await admin.createIndex({
	slug: "products",
	displayName: "Products",
	fields: [
		{ name: "title", type: "string" },
		{ name: "price", type: "float", facet: true },
		{ name: "category", type: "string", facet: true },
	],
	defaultSortingField: "price",
});

const indexes = await admin.listIndexes();
const stats = await admin.getIndexStats(indexes[0].id);

// Document CRUD
await admin.upsertDocument("index_id", "doc_1", {
	title: "Running Shoes",
	price: 89.99,
	category: "Footwear",
});

await admin.batchUpsertDocuments("index_id", [
	{ id: "doc_2", title: "T-Shirt", price: 29.99 },
	{ id: "doc_3", title: "Cap", price: 14.99 },
]);

// API key management
const { rawKey, id } = await admin.createKey({
	indexSlug: "products",
	name: "My App Key",
	scopes: ["search"],
	allowedOrigins: ["https://myapp.com"],
	rateLimitPerMinute: 60,
});

console.log("Save this key — shown once:", rawKey);

await admin.revokeKey(id);

// Synonyms & Curations
await admin.createSynonym("index_id", {
	root: "shoe",
	replacements: ["sneaker", "trainer"],
});

const curations = await admin.listCurations("index_id");

// Analytics
const analytics = await admin.getAnalytics({ period: "last30" });
console.log(analytics.totalSearches, analytics.ctr);

const usage = await admin.getUsage(7);
console.log(usage.rows);
```

## Error Handling

```ts
import { SdkError, SearchClient } from "@aacsearch/client";

const client = new SearchClient({ baseUrl, apiKey, indexSlug: "test" });

try {
	await client.search({ q: "test" });
} catch (err) {
	if (err instanceof SdkError) {
		switch (err.code) {
			case "rate_limited":
				// Back off and retry
				break;
			case "quota_exceeded":
				// Contact billing
				break;
			case "unauthorized":
				// API key is invalid
				break;
			default:
				console.error(err.message, err.details);
		}
	}
}
```

### Error codes

| Code                   | When                                    | HTTP Status |
| ---------------------- | --------------------------------------- | ----------- |
| `missing_bearer_token` | No auth header                          | 401         |
| `unauthorized`         | Empty or invalid token format           | 401         |
| `forbidden`            | Invalid/expired/revoked API key         | 403         |
| `not_found`            | Project, index, key, or doc not found   | 404         |
| `conflict`             | Index slug or project slug already used | 409         |
| `rate_limited`         | Per-key per-minute limit exceeded       | 429         |
| `quota_exceeded`       | Monthly plan limits exceeded            | 402         |
| `invalid_input`        | Validation error in request body        | 400         |
| `invalid_json`         | Request body is not valid JSON          | 400         |
| `search_failed`        | Upstream Typesense or DB error          | 502         |
| `internal_error`       | Server-side processing error            | 502         |
| `network_error`        | Fetch failed or connection refused      | 0           |

## API Coverage

| Category         | Methods                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Project          | `getProject`, `createProject`, `getProjectById`                                                     |
| Index Management | `listIndexes`, `getIndex`, `createIndex`, `updateIndex`, `deleteIndex`, `getIndexStats`             |
| Documents        | `listDocuments`, `upsertDocument`, `batchUpsertDocuments`, `deleteDocument`, `batchDeleteDocuments` |
| Search           | `search`, `multiSearch`                                                                             |
| API Keys         | `listKeys`, `createKey`, `revokeKey`                                                                |
| Analytics        | `getAnalytics`, `getUsage`                                                                          |
| Synonyms         | `listSynonyms`, `createSynonym`, `upsertSynonyms`, `deleteSynonym`                                  |
| Curations        | `listCurations`, `createCuration`, `upsertCurations`, `deleteCuration`                              |
| Sorting Fields   | `listSortingFields`, `createSortingField`, `replaceSortingFields`, `deleteSortingField`             |
| Facets           | `listFacets`                                                                                        |

## Development

```bash
pnpm build          # compile to dist/
pnpm type-check     # type-check without emitting
pnpm clean          # remove build artifacts
```

## Publishing

```bash
pnpm publish        # publishes to npm as @aacsearch/client
```

Ensure you've logged in and have publish access to the `@aacsearch` npm org.
