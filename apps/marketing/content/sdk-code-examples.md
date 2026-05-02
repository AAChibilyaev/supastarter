# SDK Code Examples — TypeScript, PHP, Python, Swift

**Owner: CMO (content) → CTO (code implementation)**
**Status: Content draft ready — needs MDX page + i18n keys in all 5 locales**

> This document provides SDK usage examples in 4 languages (TypeScript, PHP, Python, Swift)
> for 5 operations: Search, Index Management, Documents CRUD, Synonyms, Curations.
>
> These examples should be added to the marketing site at `/[locale]/developers/sdk-examples`
> with a tabbed code viewer showing all 4 languages per operation.

---

## Route

`/[locale]/developers/sdk-examples`

### SEO Meta

- **Title (EN):** AACsearch SDK Code Examples — TypeScript, PHP, Python, Swift | Developer Docs
- **Description (EN):** Ready-to-use SDK examples for AACsearch. Search, index management, document CRUD, synonyms, and curations in TypeScript, PHP, Python, and Swift.
- **H1:** SDK Code Examples

### Feature: Tabbed Code Viewer

Each operation should display as a section with a tab bar: **TypeScript | PHP | Python | Swift**.
The tabs switch the visible code block without page navigation. Use shared tabs state or a client component.

---

## Section 1: Search

### TypeScript

```typescript
// Browser-safe search client
import { SearchClient } from "@repo/search-client";

const client = new SearchClient({
	baseUrl: "https://your-app.com",
	apiKey: "ss_search_your_key",
	indexSlug: "products",
});

// Basic search
const results = await client.search({
	q: "wireless headphones",
	queryBy: "title,description,brand",
	page: 1,
	perPage: 20,
});

console.log(results.hits);

// Search with filters
const filtered = await client.search({
	q: "headphones",
	filterBy: "category:=electronics && price:<200",
	sortBy: "_text_match:desc",
});

// Multi-search (multiple queries in one request)
const multiResults = await client.multiSearch([
	{ q: "headphones", queryBy: "title", perPage: 5 },
	{ q: "speakers", queryBy: "title", perPage: 5 },
]);
```

### PHP

```php
// AACsearch search via REST API
$apiKey = 'ss_search_your_key';
$baseUrl = 'https://your-app.com';
$indexSlug = 'products';

// Basic search
$ch = curl_init("$baseUrl/api/v1/indexes/$indexSlug/search");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "X-API-Key: $apiKey",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'q' => 'wireless headphones',
        'query_by' => 'title,description,brand',
        'page' => 1,
        'per_page' => 20,
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);

$response = curl_exec($ch);
$results = json_decode($response, true);
curl_close($ch);

print_r($results['hits']);

// Search with filters
$ch = curl_init("$baseUrl/api/v1/indexes/$indexSlug/search");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "X-API-Key: $apiKey",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'q' => 'headphones',
        'filter_by' => 'category:=electronics && price:<200',
        'sort_by' => '_text_match:desc',
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);
$filtered = json_decode(curl_exec($ch), true);
curl_close($ch);
```

### Python

```python
# AACsearch search via REST API
import httpx

API_KEY = "ss_search_your_key"
BASE_URL = "https://your-app.com"
INDEX_SLUG = "products"

# Basic search
with httpx.Client() as client:
    response = client.post(
        f"{BASE_URL}/api/v1/indexes/{INDEX_SLUG}/search",
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "q": "wireless headphones",
            "query_by": "title,description,brand",
            "page": 1,
            "per_page": 20,
        },
    )
    results = response.json()
    print(results["hits"])

    # Search with filters
    filtered = client.post(
        f"{BASE_URL}/api/v1/indexes/{INDEX_SLUG}/search",
        headers={"X-API-Key": API_KEY},
        json={
            "q": "headphones",
            "filter_by": "category:=electronics && price:<200",
            "sort_by": "_text_match:desc",
        },
    )
    print(filtered.json()["hits"])
```

### Swift

```swift
// AACsearch search via REST API (Swift + URLSession)
import Foundation

let API_KEY = "ss_search_your_key"
let BASE_URL = "https://your-app.com"
let INDEX_SLUG = "products"

struct SearchParams: Codable {
    let q: String
    let queryBy: String?
    let page: Int?
    let perPage: Int?
    let filterBy: String?
    let sortBy: String?

    enum CodingKeys: String, CodingKey {
        case q
        case queryBy = "query_by"
        case page, perPage = "per_page"
        case filterBy = "filter_by"
        case sortBy = "sort_by"
    }
}

struct SearchResult: Codable {
    let hits: [[String: AnyCodable]]
    let found: Int
    let page: Int
}

func search(params: SearchParams) async throws -> SearchResult {
    let url = URL(string: "\(BASE_URL)/api/v1/indexes/\(INDEX_SLUG)/search")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue(API_KEY, forHTTPHeaderField: "X-API-Key")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(params)

    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(SearchResult.self, from: data)
}

// Usage
let results = try await search(params: SearchParams(
    q: "wireless headphones",
    queryBy: "title,description,brand",
    page: 1,
    perPage: 20
))
print(results.hits)
```

---

## Section 2: Index Management

### TypeScript

```typescript
import { AdminClient } from "@repo/search-client";

const admin = new AdminClient({
	baseUrl: "https://api.aacsearch.com",
	apiKey: "aa_admin_your_key",
	projectId: "org_xxx",
});

// List all indexes
const indexes = await admin.listIndexes();

// Create an index
const newIndex = await admin.createIndex({
	name: "Products",
	slug: "products",
	fields: [
		{ name: "title", type: "string" },
		{ name: "description", type: "string" },
		{ name: "price", type: "float" },
		{ name: "category", type: "string" },
		{ name: "in_stock", type: "bool" },
	],
	defaultSortingField: "price",
});

// Get index details
const index = await admin.getIndex(newIndex.id);

// Update an index
await admin.updateIndex(index.id, {
	name: "Updated Products",
});

// Delete an index
await admin.deleteIndex(index.id);
```

### PHP

```php
// Index management via REST API
$apiKey = 'aa_admin_your_key';
$baseUrl = 'https://api.aacsearch.com';
$projectId = 'org_xxx';

function apiCall($method, $url, $apiKey, $body = null) {
    $ch = curl_init($url);
    $headers = ["X-API-Key: $apiKey"];
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        $headers[] = "Content-Type: application/json";
    }
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res, true);
}

// List indexes
$indexes = apiCall('GET', "$baseUrl/api/v1/projects/$projectId/indexes", $apiKey);

// Create index
$newIndex = apiCall('POST', "$baseUrl/api/v1/projects/$projectId/indexes", $apiKey, [
    'name' => 'Products',
    'slug' => 'products',
    'fields' => [
        ['name' => 'title', 'type' => 'string'],
        ['name' => 'description', 'type' => 'string'],
        ['name' => 'price', 'type' => 'float'],
        ['name' => 'category', 'type' => 'string'],
    ],
    'default_sorting_field' => 'price',
]);

// Delete index
apiCall('DELETE', "$baseUrl/api/v1/indexes/$indexId", $apiKey);
```

### Python

```python
# Index management via REST API
import httpx

API_KEY = "aa_admin_your_key"
BASE_URL = "https://api.aacsearch.com"
PROJECT_ID = "org_xxx"

def api(method, path, json=None):
    with httpx.Client() as client:
        r = client.request(
            method,
            f"{BASE_URL}{path}",
            headers={"X-API-Key": API_KEY},
            json=json,
        )
        return r.json()

# List all indexes
indexes = api("GET", f"/api/v1/projects/{PROJECT_ID}/indexes")

# Create an index
new_index = api("POST", f"/api/v1/projects/{PROJECT_ID}/indexes", json={
    "name": "Products",
    "slug": "products",
    "fields": [
        {"name": "title", "type": "string"},
        {"name": "description", "type": "string"},
        {"name": "price", "type": "float"},
        {"name": "category", "type": "string"},
        {"name": "in_stock", "type": "bool"},
    ],
    "default_sorting_field": "price",
})

# Delete an index
api("DELETE", f"/api/v1/indexes/{new_index['id']}")
```

### Swift

```swift
// Index management via REST API
import Foundation

let API_KEY = "aa_admin_your_key"
let BASE_URL = "https://api.aacsearch.com"
let PROJECT_ID = "org_xxx"

struct IndexField: Codable {
    let name: String
    let type: String
}

struct CreateIndexInput: Codable {
    let name: String
    let slug: String
    let fields: [IndexField]
    let defaultSortingField: String?

    enum CodingKeys: String, CodingKey {
        case name, slug, fields
        case defaultSortingField = "default_sorting_field"
    }
}

func apiRequest<T: Codable>(_ method: String, _ path: String, body: T? = nil) async throws -> [String: Any] {
    let url = URL(string: "\(BASE_URL)\(path)")!
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue(API_KEY, forHTTPHeaderField: "X-API-Key")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    if let body = body {
        request.httpBody = try JSONEncoder().encode(body)
    }
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
}

// List indexes
let indexes = try await apiRequest("GET", "/api/v1/projects/\(PROJECT_ID)/indexes")

// Create index
let newIndex = try await apiRequest("POST", "/api/v1/projects/\(PROJECT_ID)/indexes", body: CreateIndexInput(
    name: "Products",
    slug: "products",
    fields: [
        IndexField(name: "title", type: "string"),
        IndexField(name: "price", type: "float"),
    ],
    defaultSortingField: "price"
))
```

---

## Section 3: Documents CRUD

### TypeScript

```typescript
import { AdminClient } from "@repo/search-client";

const admin = new AdminClient({
	baseUrl: "https://api.aacsearch.com",
	apiKey: "aa_admin_your_key",
	projectId: "org_xxx",
});

const indexId = "idx_products";

// Browse / list documents
const docs = await admin.listDocuments(indexId, {
	page: 1,
	perPage: 50,
});

// Upsert a single document
await admin.upsertDocument(indexId, "doc_001", {
	title: "Wireless Headphones Pro",
	description: "Noise-cancelling Bluetooth 5.3 headphones",
	price: 199.99,
	category: "electronics",
	in_stock: true,
	tags: ["audio", "wireless", "premium"],
});

// Batch upsert (up to 5000 at a time)
const batchResult = await admin.batchUpsertDocuments(indexId, [
	{ id: "doc_001", title: "Product A", price: 29.99 },
	{ id: "doc_002", title: "Product B", price: 49.99 },
	{ id: "doc_003", title: "Product C", price: 99.99 },
]);

console.log(batchResult); // { success: true, count: 3 }

// Delete a single document
await admin.deleteDocument(indexId, "doc_001");

// Batch delete documents
await admin.batchDeleteDocuments(indexId, ["doc_002", "doc_003"]);
```

### PHP

```php
// Document CRUD via REST API
$apiKey = 'aa_admin_your_key';
$baseUrl = 'https://api.aacsearch.com';
$indexId = 'idx_products';

// Upsert a single document
$ch = curl_init("$baseUrl/api/v1/indexes/$indexId/documents/doc_001");
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => 'PUT',
    CURLOPT_HTTPHEADER => [
        "X-API-Key: $apiKey",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'title' => 'Wireless Headphones Pro',
        'description' => 'Noise-cancelling Bluetooth 5.3',
        'price' => 199.99,
        'category' => 'electronics',
        'in_stock' => true,
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);
$result = json_decode(curl_exec($ch), true);
curl_close($ch);

// Batch upsert
$ch = curl_init("$baseUrl/api/v1/indexes/$indexId/documents:batch");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "X-API-Key: $apiKey",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'documents' => [
            ['id' => 'doc_001', 'title' => 'Product A', 'price' => 29.99],
            ['id' => 'doc_002', 'title' => 'Product B', 'price' => 49.99],
        ],
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);
$batchResult = json_decode(curl_exec($ch), true);
curl_close($ch);

// Delete document
$ch = curl_init("$baseUrl/api/v1/indexes/$indexId/documents/doc_001");
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => 'DELETE',
    CURLOPT_HTTPHEADER => ["X-API-Key: $apiKey"],
    CURLOPT_RETURNTRANSFER => true,
]);
curl_exec($ch);
curl_close($ch);
```

### Python

```python
# Document CRUD via REST API
import httpx

API_KEY = "aa_admin_your_key"
BASE_URL = "https://api.aacsearch.com"
INDEX_ID = "idx_products"

headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

with httpx.Client() as client:
    # Upsert single document
    result = client.put(
        f"{BASE_URL}/api/v1/indexes/{INDEX_ID}/documents/doc_001",
        headers=headers,
        json={
            "title": "Wireless Headphones Pro",
            "description": "Noise-cancelling Bluetooth 5.3",
            "price": 199.99,
            "category": "electronics",
            "in_stock": True,
        },
    ).json()
    print(result)  # {"id": "doc_001", "queued": True}

    # Batch upsert
    batch = client.post(
        f"{BASE_URL}/api/v1/indexes/{INDEX_ID}/documents:batch",
        headers=headers,
        json={
            "documents": [
                {"id": "doc_001", "title": "Product A", "price": 29.99},
                {"id": "doc_002", "title": "Product B", "price": 49.99},
            ],
        },
    ).json()

    # Delete document
    client.delete(
        f"{BASE_URL}/api/v1/indexes/{INDEX_ID}/documents/doc_001",
        headers=headers,
    )
```

### Swift

```swift
// Document CRUD via REST API
import Foundation

let API_KEY = "aa_admin_your_key"
let BASE_URL = "https://api.aacsearch.com"
let INDEX_ID = "idx_products"

struct Document: Codable {
    let id: String
    let title: String
    let price: Double
    let category: String?
    let inStock: Bool?

    enum CodingKeys: String, CodingKey {
        case id, title, price, category
        case inStock = "in_stock"
    }
}

// Upsert a single document
func upsertDocument(_ doc: Document) async throws -> [String: Any] {
    let url = URL(string: "\(BASE_URL)/api/v1/indexes/\(INDEX_ID)/documents/\(doc.id)")!
    var request = URLRequest(url: url)
    request.httpMethod = "PUT"
    request.setValue(API_KEY, forHTTPHeaderField: "X-API-Key")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(doc)
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}

let result = try await upsertDocument(Document(
    id: "doc_001", title: "Wireless Headphones Pro",
    price: 199.99, category: "electronics", inStock: true
))
print(result)
```

---

## Section 4: Synonyms

### TypeScript

```typescript
import { AdminClient } from "@repo/search-client";

const admin = new AdminClient({
	baseUrl: "https://api.aacsearch.com",
	apiKey: "aa_admin_your_key",
	projectId: "org_xxx",
});

const indexId = "idx_products";

// List synonyms
const synonyms = await admin.listSynonyms(indexId);

// Create a one-way synonym (laptop → computer)
await admin.createSynonym(indexId, {
	root: "laptop",
	synonyms: ["notebook", "ultrabook"],
});

// Create a multi-way synonym (all terms are equivalent)
await admin.createSynonym(indexId, {
	synonyms: ["sneakers", "trainers", "running shoes", "athletic footwear"],
});

// Upsert (replace) all synonyms
await admin.upsertSynonyms(indexId, [
	{ synonyms: ["phone", "smartphone", "mobile"] },
	{ root: "cheap", synonyms: ["affordable", "budget", "economical"] },
]);

// Delete a synonym
await admin.deleteSynonym(indexId, "synonym_id_here");
```

### PHP

```php
// Synonyms via REST API
$apiKey = 'aa_admin_your_key';
$baseUrl = 'https://api.aacsearch.com';
$indexId = 'idx_products';

// Create a one-way synonym
$ch = curl_init("$baseUrl/api/v1/indexes/$indexId/synonyms");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "X-API-Key: $apiKey",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'root' => 'laptop',
        'synonyms' => ['notebook', 'ultrabook'],
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);
$synonym = json_decode(curl_exec($ch), true);
curl_close($ch);

// List synonyms
$ch = curl_init("$baseUrl/api/v1/indexes/$indexId/synonyms");
curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: $apiKey"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$synonyms = json_decode(curl_exec($ch), true);
curl_close($ch);

// Delete a synonym
$ch = curl_init("$baseUrl/api/v1/indexes/$indexId/synonyms/$synonymId");
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => 'DELETE',
    CURLOPT_HTTPHEADER => ["X-API-Key: $apiKey"],
    CURLOPT_RETURNTRANSFER => true,
]);
curl_exec($ch);
curl_close($ch);
```

### Python

```python
# Synonyms via REST API
import httpx

API_KEY = "aa_admin_your_key"
BASE_URL = "https://api.aacsearch.com"
INDEX_ID = "idx_products"

headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

with httpx.Client() as client:
    # Create a multi-way synonym
    synonym = client.post(
        f"{BASE_URL}/api/v1/indexes/{INDEX_ID}/synonyms",
        headers=headers,
        json={
            "synonyms": ["sneakers", "trainers", "running shoes"],
        },
    ).json()

    # List all synonyms
    synonyms = client.get(
        f"{BASE_URL}/api/v1/indexes/{INDEX_ID}/synonyms",
        headers=headers,
    ).json()

    # Delete a synonym
    client.delete(
        f"{BASE_URL}/api/v1/indexes/{INDEX_ID}/synonyms/{synonym['id']}",
        headers=headers,
    )
```

### Swift

```swift
// Synonyms via REST API
import Foundation

let API_KEY = "aa_admin_your_key"
let BASE_URL = "https://api.aacsearch.com"
let INDEX_ID = "idx_products"

struct CreateSynonymInput: Codable {
    let root: String?
    let synonyms: [String]
}

struct Synonym: Codable {
    let id: String
    let root: String?
    let synonyms: [String]
}

func createSynonym(_ input: CreateSynonymInput) async throws -> Synonym {
    let url = URL(string: "\(BASE_URL)/api/v1/indexes/\(INDEX_ID)/synonyms")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue(API_KEY, forHTTPHeaderField: "X-API-Key")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(input)
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(Synonym.self, from: data)
}

let synonym = try await createSynonym(CreateSynonymInput(
    root: "laptop", synonyms: ["notebook", "ultrabook"]
))
print(synonym)
```

---

## Section 5: Curations

### TypeScript

```typescript
import { AdminClient } from "@repo/search-client";

const admin = new AdminClient({
	baseUrl: "https://api.aacsearch.com",
	apiKey: "aa_admin_your_key",
	projectId: "org_xxx",
});

const indexId = "idx_products";

// List curations
const curations = await admin.listCurations(indexId);

// Create a curation (pin specific results for a query)
await admin.createCuration(indexId, {
	query: "best headphones",
	curatedIds: ["doc_050", "doc_023", "doc_101"],
});

// Upsert (replace) all curations
await admin.upsertCurations(indexId, [
	{ query: "sale", curatedIds: ["doc_200", "doc_201", "doc_202"] },
	{ query: "new arrivals", curatedIds: ["doc_300", "doc_301"] },
]);

// Delete a curation
await admin.deleteCuration(indexId, "curation_id_here");
```

### PHP

```php
// Curations via REST API
$apiKey = 'aa_admin_your_key';
$baseUrl = 'https://api.aacsearch.com';
$indexId = 'idx_products';

// Create a curation
$ch = curl_init("$baseUrl/api/v1/indexes/$indexId/curations");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "X-API-Key: $apiKey",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'query' => 'best headphones',
        'curated_ids' => ['doc_050', 'doc_023', 'doc_101'],
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);
$curation = json_decode(curl_exec($ch), true);
curl_close($ch);

// List curations
$ch = curl_init("$baseUrl/api/v1/indexes/$indexId/curations");
curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: $apiKey"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$curations = json_decode(curl_exec($ch), true);
curl_close($ch);
```

### Python

```python
# Curations via REST API
import httpx

API_KEY = "aa_admin_your_key"
BASE_URL = "https://api.aacsearch.com"
INDEX_ID = "idx_products"

headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

with httpx.Client() as client:
    # Create a curation
    curation = client.post(
        f"{BASE_URL}/api/v1/indexes/{INDEX_ID}/curations",
        headers=headers,
        json={
            "query": "best headphones",
            "curated_ids": ["doc_050", "doc_023", "doc_101"],
        },
    ).json()

    # List all curations
    curations = client.get(
        f"{BASE_URL}/api/v1/indexes/{INDEX_ID}/curations",
        headers=headers,
    ).json()

    # Delete a curation
    client.delete(
        f"{BASE_URL}/api/v1/indexes/{INDEX_ID}/curations/{curation['id']}",
        headers=headers,
    )
```

### Swift

```swift
// Curations via REST API
import Foundation

let API_KEY = "aa_admin_your_key"
let BASE_URL = "https://api.aacsearch.com"
let INDEX_ID = "idx_products"

struct CreateCurationInput: Codable {
    let query: String
    let curatedIds: [String]

    enum CodingKeys: String, CodingKey {
        case query
        case curatedIds = "curated_ids"
    }
}

struct Curation: Codable {
    let id: String
    let query: String
    let curatedIds: [String]

    enum CodingKeys: String, CodingKey {
        case id, query
        case curatedIds = "curated_ids"
    }
}

func createCuration(_ input: CreateCurationInput) async throws -> Curation {
    let url = URL(string: "\(BASE_URL)/api/v1/indexes/\(INDEX_ID)/curations")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue(API_KEY, forHTTPHeaderField: "X-API-Key")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(input)
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(Curation.self, from: data)
}

let curation = try await createCuration(CreateCurationInput(
    query: "best headphones",
    curatedIds: ["doc_050", "doc_023", "doc_101"]
))
print(curation)
```

---

## Translation Key Structure

```json
{
	"sdkExamplesPage": {
		"title": "SDK Code Examples",
		"description": "Ready-to-use code examples for the AACsearch API in TypeScript, PHP, Python, and Swift."
	},
	"sdkExamples": {
		"search": {
			"title": "Search",
			"description": "Perform full-text search with filters, sorting, and multi-search."
		},
		"indexManagement": {
			"title": "Index Management",
			"description": "Create, update, list, and delete search indexes."
		},
		"documents": {
			"title": "Documents CRUD",
			"description": "Upsert, batch upsert, list, and delete documents."
		},
		"synonyms": {
			"title": "Synonyms",
			"description": "Define search synonyms for improved relevance."
		},
		"curations": {
			"title": "Curations",
			"description": "Pin specific results to queries for editorial control."
		},
		"tabs": {
			"ts": "TypeScript",
			"php": "PHP",
			"python": "Python",
			"swift": "Swift"
		},
		"copyCode": "Copy code",
		"copied": "Copied!",
		"cta": "Try it yourself"
	}
}
```

---

## Files to create (CTO)

- `apps/marketing/app/[locale]/developers/sdk-examples/page.tsx` — page with tabbed code viewer
- `apps/marketing/modules/developers/components/SdkCodeExamples.tsx` — tabbed code viewer component (client component with tabs state)
- `packages/i18n/translations/{en,de,es,fr,ru}/marketing.json` — add `sdkExamplesPage.*` and `sdkExamples.*` keys

## Suggested UI Pattern

Create a `SdkCodeViewer` client component at `apps/marketing/modules/shared/components/SdkCodeViewer.tsx`:

```tsx
interface SdkCodeViewerProps {
	operationKey: string; // e.g. "search"
	code: {
		ts: string;
		php: string;
		python: string;
		swift: string;
	};
}
```

- Renders a tab bar: TypeScript | PHP | Python | Swift
- Shows the corresponding code block with syntax highlighting
- Includes a "Copy" button per tab
- Can be reused for all 5 operations on the page
