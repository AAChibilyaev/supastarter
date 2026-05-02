# AACSearch PHP SDK

PHP client for the AACSearch v1 REST API — search, index management, synonyms, curations, analytics, and more.

## Installation

```bash
composer require aacsearch/aacsearch-php
```

Requires PHP 8.1+.

## Quick Start

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

## Error Handling

```php
use Aacsearch\{
    AacsearchException,
    AuthenticationException,
    NotFoundException,
    RateLimitException,
};

try {
    $results = $admin->listIndexes();
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

## License

MIT
