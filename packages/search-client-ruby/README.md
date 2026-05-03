# AACsearch Ruby SDK

[![Gem Version](https://badge.fury.io/rb/aacsearch.svg)](https://badge.fury.io/rb/aacsearch)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Ruby client for the [AACsearch](https://www.aacsearch.com) v2 REST API — a
hosted search-as-a-service platform powered by Typesense.

## Features

- **No external dependencies** — uses only Ruby stdlib (`net/http`, `json`, `uri`)
- **Two client classes**: search-only (browser-safe) and admin (full management)
- **Full v2 API coverage**: projects, indexes, documents, search, multi-search,
  API keys, synonyms, curations, analytics, and usage
- **Bearer token authentication** with configurable timeouts
- **Comprehensive error handling** with structured error responses
- **Cursor-based pagination** for document listing

## Installation

Add this line to your application's Gemfile:

```ruby
gem "aacsearch"
```

And then execute:

    $ bundle install

Or install it yourself as:

    $ gem install aacsearch

## Usage

### Search Client (public, search-only)

Use with search-scoped API keys (`ss_search_*`). Safe for frontend/browser
code when using scoped tokens.

```ruby
require "aacsearch"

client = Aacsearch::SearchClient.new(
  base_url: "https://api.aacsearch.com",
  api_key: "ss_search_abc123"
)

# Basic search
results = client.search("products", q: "laptop", queryBy: "title,description")

# With filters and facets
results = client.search("products", {
  q: "laptop",
  queryBy: "title,description",
  filterBy: "price:>=500",
  facetBy: "brand,category",
  sortBy: "price:desc",
  perPage: 20,
  page: 1
})

# Multi-search across indexes
results = client.multi_search([
  { indexId: "products", search: { q: "laptop", perPage: 5 } },
  { indexId: "articles", search: { q: "tech", perPage: 3 } }
])
```

### Admin Client (server-side, full management)

Requires an admin-scope API key (`aa_admin_*`). Never bundle in frontend code.

```ruby
require "aacsearch"

admin = Aacsearch::AdminClient.new(
  base_url: "https://api.aacsearch.com",
  api_key: "aa_admin_abc123"
)

# Get current project
project = admin.get_project
puts project["name"]

# List indexes
indexes = admin.list_indexes(project["id"])

# Create an index
index = admin.create_index(
  project["id"],
  "products",
  "Products",
  [
    { "name" => "title", "type" => "string", "facet" => false, "index" => true },
    { "name" => "price", "type" => "float", "sort" => true },
    { "name" => "brand", "type" => "string", "facet" => true },
    { "name" => "category", "type" => "string", "facet" => true }
  ],
  default_sorting_field: "price"
)

# Upsert documents
admin.upsert_documents(
  index["id"],
  [
    { "id" => "1", "title" => "MacBook Pro", "price" => 2499.99, "brand" => "Apple", "category" => "laptops" },
    { "id" => "2", "title" => "ThinkPad X1", "price" => 1899.99, "brand" => "Lenovo", "category" => "laptops" }
  ]
)

# List documents with cursor-based pagination
result = admin.list_documents(index["id"], per_page: 20)
result["hits"].each { |hit| puts hit["document"]["title"] }

# Get next page
if result["has_more"]
  next_page = admin.list_documents(index["id"], cursor: result["cursor"], per_page: 20)
end

# Search
results = admin.search(index["id"], q: "laptop", queryBy: "title")

# Create an API key
key = admin.create_key(
  project["id"],
  "Production search key",
  ["search"],
  rate_limit_per_minute: 1000,
  allowed_origins: ["https://example.com"]
)
puts "New API key: #{key["rawKey"]}"

# Manage synonyms
synonym = admin.create_synonym(index["id"], {
  root: "laptop",
  synonyms: ["notebook", "ultrabook"],
  locale: "en"
})

# Manage curations
curation = admin.create_curation(index["id"], {
  query: "laptop",
  pinnedIds: ["doc_1", "doc_2"],
  hiddenIds: ["doc_3"]
})

# Get analytics
analytics = admin.get_analytics(project["id"])
puts "Total searches: #{analytics["totalSearches"]}"

# Get usage
usage = admin.get_usage(project["id"])
usage["rows"].each { |row| puts "#{row["type"]}: #{row["totalCount"]}" }
```

## API Coverage

### Search (SearchClient + AdminClient)

| Method                       | Endpoint                                |
| ---------------------------- | --------------------------------------- |
| `search(index_slug, params)` | `POST /api/v2/indexes/{indexId}/search` |
| `multi_search(searches)`     | `POST /api/v2/multi-search`             |

### Projects (AdminClient)

| Method                            | Endpoint                           |
| --------------------------------- | ---------------------------------- |
| `get_project`                     | `GET /api/v2/projects`             |
| `create_project(name, slug, ...)` | `POST /api/v2/projects`            |
| `get_project_by_id(project_id)`   | `GET /api/v2/projects/{projectId}` |

### Indexes (AdminClient)

| Method                          | Endpoint                                    |
| ------------------------------- | ------------------------------------------- |
| `list_indexes(project_id)`      | `GET /api/v2/projects/{projectId}/indexes`  |
| `create_index(project_id, ...)` | `POST /api/v2/projects/{projectId}/indexes` |
| `get_index(index_id)`           | `GET /api/v2/indexes/{indexId}`             |
| `update_index(index_id, ...)`   | `PATCH /api/v2/indexes/{indexId}`           |
| `delete_index(index_id)`        | `DELETE /api/v2/indexes/{indexId}`          |
| `get_index_stats(index_id)`     | `GET /api/v2/indexes/{indexId}/stats`       |

### Documents (AdminClient)

| Method                                    | Endpoint                                                  |
| ----------------------------------------- | --------------------------------------------------------- |
| `list_documents(index_id, ...)`           | `GET /api/v2/indexes/{indexId}/documents`                 |
| `upsert_documents(index_id, docs, ...)`   | `POST /api/v2/indexes/{indexId}/documents`                |
| `get_document(index_id, doc_id)`          | `GET /api/v2/indexes/{indexId}/documents/{documentId}`    |
| `upsert_document(index_id, doc_id, data)` | `PUT /api/v2/indexes/{indexId}/documents/{documentId}`    |
| `delete_document(index_id, doc_id)`       | `DELETE /api/v2/indexes/{indexId}/documents/{documentId}` |
| `batch_delete_documents(index_id, ids)`   | `POST /api/v2/indexes/{indexId}/documents:batchDelete`    |
| `export_documents(index_id, ...)`         | `GET /api/v2/indexes/{indexId}/documents:export`          |

### API Keys (AdminClient)

| Method                        | Endpoint                                 |
| ----------------------------- | ---------------------------------------- |
| `list_keys(project_id)`       | `GET /api/v2/projects/{projectId}/keys`  |
| `create_key(project_id, ...)` | `POST /api/v2/projects/{projectId}/keys` |
| `revoke_key(key_id)`          | `DELETE /api/v2/keys/{keyId}`            |

### Synonyms (AdminClient)

| Method                                 | Endpoint                                    |
| -------------------------------------- | ------------------------------------------- |
| `list_synonyms(index_id)`              | `GET /api/v2/indexes/{indexId}/synonyms`    |
| `create_synonym(index_id, synonym)`    | `POST /api/v2/indexes/{indexId}/synonyms`   |
| `upsert_synonyms(index_id, synonyms)`  | `PUT /api/v2/indexes/{indexId}/synonyms`    |
| `delete_synonym(index_id, synonym_id)` | `DELETE /api/v2/indexes/{indexId}/synonyms` |

### Curations (AdminClient)

| Method                                  | Endpoint                                   |
| --------------------------------------- | ------------------------------------------ |
| `list_curations(index_id)`              | `GET /api/v2/indexes/{indexId}/curations`  |
| `create_curation(index_id, curation)`   | `POST /api/v2/indexes/{indexId}/curations` |
| `upsert_curations(index_id, curations)` | `PUT /api/v2/indexes/{indexId}/curations`  |

### Analytics / Usage (AdminClient)

| Method                      | Endpoint                                     |
| --------------------------- | -------------------------------------------- |
| `get_analytics(project_id)` | `GET /api/v2/projects/{projectId}/analytics` |
| `get_usage(project_id)`     | `GET /api/v2/projects/{projectId}/usage`     |

## Error Handling

The SDK raises `Aacsearch::Error` (subclass of `StandardError`) for API errors,
and `Aacsearch::NetworkError` for network-level failures.

```ruby
begin
  results = client.search("products", q: "laptop")
rescue Aacsearch::Error => e
  puts "API error: #{e.code} (#{e.status_code})"
  puts "Message: #{e.message}"
  puts "Request ID: #{e.request_id}" if e.request_id
rescue Aacsearch::NetworkError => e
  puts "Network error: #{e.message}"
end
```

## Development

After checking out the repo, run `bin/setup` to install dependencies. Then,
run `rake test` to run the tests. You can also run `bin/console` for an
interactive prompt that will allow you to experiment.

To install this gem onto your local machine, run `bundle exec rake install`.
To release a new version, update the version number in `version.rb`, and then
run `bundle exec rake release`, which will create a git tag for the version,
push git commits and tags, and push the `.gem` file to
[rubygems.org](https://rubygems.org).

## Contributing

Bug reports and pull requests are welcome on GitHub at
https://github.com/aacsearch/aacsearch-ruby.

## License

The gem is available as open source under the terms of the
[MIT License](https://opensource.org/licenses/MIT).
