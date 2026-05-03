# AACSearch PHP SDK

PHP client for AACSearch REST API (v1 + v2) — search, index management, synonyms, curations, analytics, and more.

## Installation

```bash
composer require aacsearch/aacsearch-php
```

Requires PHP 8.1+.

---

## API v2 Client (recommended for new integrations)

The `V2Client` targets the `/api/v2/*` REST API with:

- Extended error format (`requestId`, `details`, `documentationUrl`)
- Cursor-based pagination for document listing
- Document batch upsert with `action` parameter (`upsert`/`create`/`update`)
- Rate limit headers on all responses
- OpenAPI 3.1 spec available at `/api/v2/openapi.json`

```php
use Aacsearch\V2Client;
use Aacsearch\{
    AacsearchException,
    AuthenticationException,
    NotFoundException,
    RateLimitException,
    ValidationException,
};

$client = new V2Client(
    baseUrl: 'https://app.aacsearch.com',
    apiKey: 'aa_admin_...',
    projectId: 'org_xxx',
);

// ── Projects ────────────────────────────────────────────────
$project = $client->getProject();
echo $project['name'];

// ── Indexes ─────────────────────────────────────────────────
$indexes = $client->listIndexes();

$index = $client->createIndex(
    slug: 'products',
    displayName: 'Products',
    fields: [
        ['name' => 'title', 'type' => 'string'],
        ['name' => 'price', 'type' => 'float', 'sort' => true],
    ],
    defaultSortingField: 'price',
);

$client->updateIndex($index['id'], enabled: false);

$stats = $client->getIndexStats($index['id']);
echo "Documents: {$stats['documentCount']}\n";

// ── Documents (v2 cursor-based pagination) ──────────────────
$documents = $client->listDocuments(
    indexId: $index['id'],
    perPage: 50,
);

// Iterate with cursor
$cursor = $documents['nextCursor'] ?? null;
while ($cursor !== null) {
    $page = $client->listDocuments($index['id'], cursor: $cursor);
    // process $page['hits']
    $cursor = $page['nextCursor'] ?? null;
}

// Batch upsert with action
$result = $client->upsertDocuments(
    indexId: $index['id'],
    documents: [
        ['id' => 'doc_001', 'title' => 'MacBook Pro', 'price' => 2499.00],
        ['id' => 'doc_002', 'title' => 'iPhone 15', 'price' => 999.00],
    ],
    action: 'upsert', // 'upsert' | 'create' | 'update'
);
echo "Queued: {$result['queued']}\n";

// Single document operations
$client->upsertDocument($index['id'], 'doc_001', ['price' => 2399.00]);
$doc = $client->getDocument($index['id'], 'doc_001');
$client->deleteDocument($index['id'], 'doc_001');

// Batch delete
$client->batchDeleteDocuments($index['id'], ['doc_001', 'doc_002']);

// Export documents as JSONL
$export = $client->exportDocuments($index['id'], format: 'jsonl');

// ── Search ──────────────────────────────────────────────────
$results = $client->search(
    indexId: $index['id'],
    params: [
        'q' => 'laptop',
        'filterBy' => 'price:>=500',
        'sortBy' => 'price:desc',
    ],
);
echo "Found {$results['found']} results\n";

// Multi-search across indexes
$multiResults = $client->multiSearch([
    ['indexId' => 'idx_products', 'search' => ['q' => 'laptop']],
    ['indexId' => 'idx_articles', 'search' => ['q' => 'setup guide']],
]);

// ── API Keys ────────────────────────────────────────────────
$keys = $client->listKeys();

$newKey = $client->createKey(
    description: 'Production search key',
    scopes: ['search'],
    rateLimitPerMinute: 1000,
);

$client->revokeKey($newKey['id']);

// ── Synonyms ────────────────────────────────────────────────
$synonyms = $client->listSynonyms($index['id']);

$client->upsertSynonyms($index['id'], [
    ['root' => 'laptop', 'synonym' => 'notebook'],
    ['root' => 'phone', 'synonym' => 'mobile'],
]);

$client->deleteSynonym($index['id'], $synonymId);

// ── Curations ───────────────────────────────────────────────
$client->upsertCurations($index['id'], [
    ['query' => 'macbook', 'pinnedIds' => ['doc_001']],
]);

// ── Analytics ───────────────────────────────────────────────
$analytics = $client->getAnalytics(period: '7d');
$usage = $client->getUsage(windowDays: 30);

// ── OpenAPI spec ────────────────────────────────────────────
$spec = $client->getOpenApiSpec();
```

---

## API v1 Client (legacy)

The `AdminClient` and `SearchClient` target the `/api/v1/*` REST API.

### Search Client (public / browser-safe)

```php
use Aacsearch\SearchClient;

$client = new SearchClient(
    'https://app.aacsearch.com',
    'ss_search_...',
    'products'
);

$results = $client->search(['q' => 'laptop']);
echo "Found {$results['found']} results\n";
```

### Admin Client (server-side)

```php
use Aacsearch\AdminClient;

$admin = new AdminClient(
    'https://app.aacsearch.com',
    'aa_admin_...',
    'org_xxx'
);

// Create an index
$index = $admin->createIndex(
    'products',
    'Products',
    [
        ['name' => 'title', 'type' => 'string'],
        ['name' => 'price', 'type' => 'float', 'sort' => true],
    ],
    'price'
);

// Upsert a document
$admin->upsertDocument($index['id'], 'doc_001', [
    'title' => 'MacBook Pro',
    'price' => 2499.00,
]);

// List indexes
$indexes = $admin->listIndexes();

// Manage synonyms
$admin->upsertSynonyms($index['id'], [
    ['root' => 'laptop', 'synonym' => 'notebook'],
]);

// Get analytics
$analytics = $admin->getAnalytics('7d');
```

---

## Error Handling

```php
use Aacsearch\{
    AacsearchException,
    AuthenticationException,
    NotFoundException,
    RateLimitException,
    ValidationException,
};

try {
    $results = $client->listIndexes();
} catch (ValidationException $e) {
    echo "Invalid input: {$e->getMessage()}\n";
} catch (AuthenticationException $e) {
    echo "Invalid API key: {$e->getMessage()}\n";
} catch (NotFoundException $e) {
    echo "Resource not found: {$e->getMessage()}\n";
} catch (RateLimitException $e) {
    echo "Rate limited: {$e->getMessage()}\n";
} catch (AacsearchException $e) {
    echo "API error ({$e->getStatusCode()}): {$e->getMessage()}\n";
}
```

v2 errors include an extended format with `requestId` and optional `details` array and `documentationUrl`. When using `V2Client`, the `requestId` is automatically appended to the error message for easier debugging.

## License

MIT
