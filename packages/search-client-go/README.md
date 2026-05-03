# AACSearch Go SDK

[![Go Reference](https://pkg.go.dev/badge/github.com/aacsearch/aacsearch-go)](https://pkg.go.dev/github.com/aacsearch/aacsearch-go)
[![Go Version](https://img.shields.io/github/go-mod/go-version/aacsearch/aacsearch-go)](https://go.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Go client for the [AACSearch](https://aacsearch.com) v1 REST API — search, index management, synonyms, curations, analytics, and more.

> **Security rule**: never embed admin keys in browser code. Use `SearchClient` for frontend and proxy admin operations through your own backend.

## Installation

```bash
go get github.com/aacsearch/aacsearch-go
```

Requires Go 1.21+.

## Quick Start

### SearchClient (public / browser-safe)

Use with a search-scope API key (`ss_search_*`) or a scoped token (`ss_scoped_*`).

```go
package main

import (
    "log"
    "github.com/aacsearch/aacsearch-go"
)

func main() {
    client, err := aacsearch.NewSearchClient(aacsearch.SearchClientOptions{
        BaseURL:   "https://app.aacsearch.com",
        APIKey:    "ss_search_...",
        IndexSlug: "products",
    })
    if err != nil {
        log.Fatal(err)
    }

    // Basic search
    result, err := client.Search(aacsearch.SearchParams{Q: "laptop"})
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Found %d results", result.Found)

    // Multi-search
    results, err := client.MultiSearch([]aacsearch.SearchParams{
        {Q: "nike", QueryBy: "title"},
        {Q: "adidas", QueryBy: "title", FilterBy: "in_stock:=true"},
    })
}
```

### AdminClient (server-side)

Use with an admin-scope API key (`aa_admin_*`). Never bundle in browser code.

```go
package main

import (
    "log"
    "github.com/aacsearch/aacsearch-go"
)

func main() {
    admin, err := aacsearch.NewAdminClient(aacsearch.AdminClientOptions{
        BaseURL:   "https://app.aacsearch.com",
        APIKey:    "aa_admin_...",
        ProjectID: "org_xxx",
    })
    if err != nil {
        log.Fatal(err)
    }

    // Index management
    index, err := admin.CreateIndex(aacsearch.CreateIndexInput{
        Slug:        "products",
        DisplayName: "Products",
        Fields: []aacsearch.FieldDefinition{
            {Name: "title", Type: "string"},
            {Name: "price", Type: "float", Facet: boolPtr(true)},
            {Name: "category", Type: "string", Facet: boolPtr(true)},
        },
        DefaultSortingField: "price",
    })
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Created index: %s", index.ID)

    // Documents
    _, err = admin.BatchUpsertDocuments(index.ID, []map[string]interface{}{
        {"id": "doc_1", "title": "Running Shoes", "price": 89.99},
        {"id": "doc_2", "title": "T-Shirt", "price": 29.99},
    })

    // Analytics
    analytics, err := admin.GetAnalytics("7d")
    log.Printf("Total searches: %d, CTR: %.2f", analytics.TotalSearches, analytics.CTR)

    // API keys
    key, err := admin.CreateKey(aacsearch.CreateKeyInput{
        Name:      "My Search Key",
        Scopes:    []aacsearch.KeyScope{aacsearch.KeyScopeSearch},
        IndexSlug: "products",
    })
    log.Printf("Created key: %s...", key.Prefix[:8])
}

func boolPtr(b bool) *bool { return &b }
```

## Error Handling

```go
import "github.com/aacsearch/aacsearch-go"

result, err := client.Search(aacsearch.SearchParams{Q: "laptop"})
if err != nil {
    var sdkErr *aacsearch.SDKError
    if errors.As(err, &sdkErr) {
        switch sdkErr.Code {
        case "rate_limited":
            // Back off and retry
        case "unauthorized":
            // API key is invalid
        default:
            log.Printf("Error %d: %s", sdkErr.Status, sdkErr.Message)
        }
    }
}
```

## API Coverage

| Category         | Methods                                                                                             |
|------------------|-----------------------------------------------------------------------------------------------------|
| Project          | `GetProject`, `CreateProject`, `GetProjectByID`                                                     |
| Index Management | `ListIndexes`, `GetIndex`, `CreateIndex`, `UpdateIndex`, `DeleteIndex`, `GetIndexStats`             |
| Documents        | `ListDocuments`, `UpsertDocument`, `BatchUpsertDocuments`, `DeleteDocument`, `BatchDeleteDocuments` |
| Search           | `Search`, `MultiSearch`                                                                             |
| API Keys         | `ListKeys`, `CreateKey`, `RevokeKey`                                                                |
| Analytics        | `GetAnalytics`, `GetUsage`                                                                          |
| Synonyms         | `ListSynonyms`, `CreateSynonym`, `UpsertSynonyms`, `DeleteSynonym`                                  |
| Curations        | `ListCurations`, `CreateCuration`, `UpsertCurations`, `DeleteCuration`                              |
| Sorting Fields   | `ListSortingFields`, `CreateSortingField`, `ReplaceSortingFields`, `DeleteSortingField`             |
| Facets           | `ListFacets`                                                                                        |

## Development

```bash
go build ./...
go vet ./...
go test ./...
```

## License

MIT
