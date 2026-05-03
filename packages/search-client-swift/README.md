# AACsearch Swift SDK

[![Swift](https://img.shields.io/badge/Swift-5.9-orange)](https://swift.org)
[![Platforms](https://img.shields.io/badge/platforms-iOS%2015%20%7C%20macOS%2012%20%7C%20visionOS%201-lightgrey)](https://developer.apple.com)

AACsearch client library for Swift, generated from the AACsearch OpenAPI 3.1 spec.

## Requirements

- Swift 5.9+
- iOS 15.0+ / macOS 12.0+ / visionOS 1.0+
- Swift Package Manager

## Installation

### Swift Package Manager

Add the following to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/aacsearch/aacsearch-swift-sdk", from: "1.0.0")
]
```

Or add it via Xcode: **File → Add Package Dependencies** → enter the repository URL.

## Usage

### Initialize the client

```swift
import Aacsearch

let client = AacsearchClient(apiKey: "ss_search_xxx")
```

Or with custom configuration:

```swift
let config = AacsearchConfig(
    baseURL: "https://api.aacsearch.com",
    apiKey: "ss_search_xxx",
    timeout: 15
)
let client = AacsearchClient(config: config)
```

### Search products

```swift
let results = try await client.search(
    "products",
    query: "nike shoes",
    queryBy: "name,description",
    filterBy: "price:>50",
    sortBy: "price:desc",
    page: 1,
    perPage: 20
)

print("Found \(results.found) results")
for hit in results.hits {
    print(hit.document)
}
```

### Multi-search

```swift
let multiResults = try await client.multiSearch(searches: [
    MultiSearchQuery(q: "nike", queryBy: "name", perPage: 5),
    MultiSearchQuery(q: "adidas", queryBy: "name", perPage: 5),
])
```

### Manage documents

```swift
// Upsert a single document
let result = try await client.upsertDocument("products", document: [
    "id": "123",
    "name": "Nike Air Max",
    "price": 129.99,
    "description": "Classic running shoes"
])

// Batch upsert documents
let batchResult = try await client.batchUpsertDocuments("products", documents: [
    ["id": "1", "name": "Product A"],
    ["id": "2", "name": "Product B"],
])

// Delete a document
let deleteResult = try await client.deleteDocument("products", documentId: "123")
```

### List indexes and stats

```swift
let indexes = try await client.listIndexes(projectId: "proj_xxx")
let stats = try await client.getIndexStats("products")
print("Document count: \(stats.documentCount)")
```

## API Coverage

| Feature | Status |
|---------|--------|
| Search (single index) | ✅ |
| Multi-search | ✅ |
| Document CRUD | ✅ |
| Batch upsert | ✅ |
| Synonyms | ✅ |
| Curations | ✅ |
| Index management | ✅ |
| Index stats | ✅ |
| Analytics | 🔜 |
| API Keys | 🔜 |
| Async/await | ✅ |
| Codable models | ✅ |

## License

MIT
