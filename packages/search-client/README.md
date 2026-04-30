# @repo/search-client

Browser-safe TypeScript client for the AACSearch public search API.

> **Never** embed an admin or write key here — only search-scope tokens (`ss_search_*` or `ss_scoped_*`).

## Usage

```ts
import { SearchClient } from "@repo/search-client";

const client = new SearchClient({
  baseUrl: "https://app.example.com",
  apiKey: "ss_search_...",
  indexSlug: "products",
});

const result = await client.search({
  q: "running shoes",
  queryBy: "title,description",
  facetBy: "category,brand",
});

console.log(result.hits, result.found);
```

## Federated (multi-search)

```ts
const { results } = await client.multiSearch([
  { q: "nike", queryBy: "title" },
  { q: "adidas", queryBy: "title", filterBy: "in_stock:=true" },
]);
```

## Errors

```ts
import { SearchClient, SearchClientError } from "@repo/search-client";

try {
  await client.search({ q: "..." });
} catch (e) {
  if (e instanceof SearchClientError) {
    if (e.code === "rate_limited") { /* back off */ }
    if (e.code === "quota_exceeded") { /* contact billing owner */ }
  }
}
```

| Status | `code` | When |
|---|---|---|
| 401 | `missing_bearer_token` / `invalid_or_revoked_key` / `invalid_or_expired_scoped_token` | bad auth |
| 402 | `quota_exceeded` | org's monthly search plan limit hit |
| 403 | `origin_not_allowed` / `key_does_not_match_index` | per-key origin allow-list / wrong index |
| 429 | `rate_limited` | per-key per-minute limit |
| 502 | `search_failed` | upstream Typesense error |
