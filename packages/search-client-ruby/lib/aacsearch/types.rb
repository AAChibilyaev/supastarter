# frozen_string_literal: true

module Aacsearch
  # Type definitions matching the AACsearch v2 API OpenAPI spec.
  #
  # These are documentation-oriented structures — the client methods accept
  # and return Hash objects matching these shapes. The constants and comments
  # below serve as a reference for the expected fields.

  # @!group Project

  # Project (organization) as returned by the v2 API.
  #
  # @example Response shape
  #   {
  #     "id" => "proj_abc123",
  #     "name" => "My Org",
  #     "slug" => "my-org",
  #     "logo" => "https://example.com/logo.png",
  #     "membersCount" => 3,
  #     "createdAt" => "2025-01-01T00:00:00Z",
  #     "updatedAt" => "2025-06-01T00:00:00Z"
  #   }
  module ProjectFields
    REQUIRED = %w[id name slug].freeze
    OPTIONAL = %w[logo membersCount createdAt updatedAt].freeze
  end

  # Input for creating a project (POST /api/v2/projects).
  #
  # @example
  #   {
  #     "name" => "My Org",
  #     "slug" => "my-org",
  #     "logo" => "https://example.com/logo.png"   # optional
  #   }
  module CreateProjectInput
    REQUIRED = %w[name slug].freeze
    OPTIONAL = %w[logo].freeze
  end

  # @!endgroup

  # @!group Search Index

  # Search index as returned by the v2 API.
  #
  # @example Response shape
  #   {
  #     "id" => "idx_abc123",
  #     "slug" => "products",
  #     "displayName" => "Products",
  #     "enabled" => true,
  #     "projectId" => "proj_abc123",
  #     "documentCount" => 1500,
  #     "createdAt" => "2025-01-01T00:00:00Z",
  #     "updatedAt" => "2025-06-01T00:00:00Z"
  #   }
  module SearchIndexFields
    REQUIRED = %w[id slug displayName enabled projectId createdAt updatedAt].freeze
    OPTIONAL = %w[documentCount].freeze
  end

  # Input for creating a search index (POST /api/v2/projects/{projectId}/indexes).
  #
  # @example
  #   {
  #     "slug" => "products",
  #     "displayName" => "Products",
  #     "fields" => [
  #       { "name" => "title", "type" => "string", "facet" => false, "index" => true },
  #       { "name" => "price", "type" => "float", "sort" => true }
  #     ],
  #     "defaultSortingField" => "price"   # optional
  #   }
  module CreateIndexInput
    REQUIRED = %w[slug displayName fields].freeze
    OPTIONAL = %w[defaultSortingField].freeze
  end

  # Input for updating a search index (PATCH /api/v2/indexes/{indexId}).
  # All fields are optional — only provided fields will be updated.
  #
  # @example
  #   {
  #     "displayName" => "Updated Products",
  #     "enabled" => false,
  #     "defaultSortingField" => "title"
  #   }
  module UpdateIndexInput
    OPTIONAL = %w[displayName enabled defaultSortingField].freeze
  end

  # A field definition within a search index.
  #
  # @example
  #   {
  #     "name" => "title",
  #     "type" => "string",
  #     "facet" => false,
  #     "index" => true,
  #     "optional" => false,
  #     "locale" => "en",
  #     "sort" => true,
  #     "infix" => false,
  #     "numDimensions" => nil
  #   }
  #
  # Valid types: string, int32, int64, float, bool, string[], int32[],
  # int64[], float[], bool[], geopoint, geopoint[], object, object[], auto
  module SearchField
    REQUIRED = %w[name type].freeze
    OPTIONAL = %w[facet index optional locale sort infix numDimensions].freeze
  end

  # Index statistics returned by GET /api/v2/indexes/{indexId}/stats.
  #
  # @example Response shape
  #   {
  #     "id" => "idx_abc123",
  #     "slug" => "products",
  #     "displayName" => "Products",
  #     "documentCount" => 1500,
  #     "usage" => {
  #       "since" => "2025-01-01T00:00:00Z",
  #       "totalSearches" => 50000,
  #       "totalIndexed" => 2000,
  #       "zeroResultCount" => 200,
  #       "clickCount" => 3500
  #     },
  #     "ingestQueue" => {
  #       "pending" => 0,
  #       "failed" => 0
  #     },
  #     "apiKeysCount" => 3,
  #     "createdAt" => "2025-01-01T00:00:00Z",
  #     "updatedAt" => "2025-06-01T00:00:00Z"
  #   }
  module IndexStats
    OPTIONAL = %w[id slug displayName documentCount usage ingestQueue apiKeysCount createdAt updatedAt].freeze
  end

  # @!endgroup

  # @!group Search

  # Search request parameters (POST /api/v2/indexes/{indexId}/search).
  #
  # @example
  #   {
  #     "q" => "laptop",
  #     "queryBy" => "title,description",
  #     "filterBy" => "price:>=500",
  #     "facetBy" => "brand,category",
  #     "sortBy" => "price:desc",
  #     "perPage" => 20,
  #     "page" => 1,
  #     "highlightFields" => "title",
  #     "includeFields" => "title,price,brand",
  #     "excludeFields" => "internal_notes",
  #     "numTypos" => 2,
  #     "prefix" => true,
  #     "exact" => false,
  #     "prioritizeExactMatch" => true,
  #     "hybridConfidence" => 0.5,
  #     "curationTags" => "promoted"
  #   }
  module SearchRequest
    OPTIONAL = %w[
      q queryBy filterBy facetBy sortBy perPage page
      highlightFields includeFields excludeFields
      numTypos prefix exact prioritizeExactMatch
      hybridConfidence curationTags
    ].freeze
  end

  # A single item in a multi-search request (POST /api/v2/multi-search).
  #
  # @example
  #   {
  #     "indexId" => "products",
  #     "search" => { "q" => "laptop", "queryBy" => "title" }
  #   }
  module MultiSearchItem
    REQUIRED = %w[indexId search].freeze
  end

  # @!endgroup

  # @!group Documents

  # Options for listing documents (GET /api/v2/indexes/{indexId}/documents).
  #
  # @example
  #   {
  #     "cursor" => "eyJpZCI6I...",
  #     "perPage" => 20,
  #     "filterBy" => "category:=electronics"
  #   }
  module ListDocumentsOptions
    OPTIONAL = %w[cursor perPage filterBy].freeze
  end

  # Input for batch upserting documents (POST /api/v2/indexes/{indexId}/documents).
  #
  # @example
  #   {
  #     "documents" => [
  #       { "id" => "1", "title" => "Laptop", "price" => 999.99 }
  #     ],
  #     "action" => "upsert"   # one of: upsert, create, update
  #   }
  module UpsertDocumentsInput
    REQUIRED = %w[documents].freeze
    OPTIONAL = %w[action].freeze
  end

  # Input for batch deleting documents (POST /api/v2/indexes/{indexId}/documents:batchDelete).
  #
  # @example
  #   { "ids" => ["doc_1", "doc_2", "doc_3"] }
  module BatchDeleteInput
    REQUIRED = %w[ids].freeze
  end

  # Options for exporting documents (GET /api/v2/indexes/{indexId}/documents:export).
  #
  # @example
  #   {
  #     "format" => "jsonl",   # or "json"
  #     "filterBy" => "category:=electronics"
  #   }
  module ExportDocumentsOptions
    OPTIONAL = %w[format filterBy].freeze
  end

  # @!endgroup

  # @!group API Keys

  # Input for creating an API key (POST /api/v2/projects/{projectId}/keys).
  #
  # @example
  #   {
  #     "description" => "Production search key",
  #     "scopes" => ["search"],
  #     "rateLimitPerMinute" => 1000,
  #     "allowedOrigins" => ["https://example.com"]
  #   }
  module CreateKeyInput
    REQUIRED = %w[description scopes].freeze
    OPTIONAL = %w[rateLimitPerMinute allowedOrigins].freeze
  end

  # @!endgroup

  # @!group Synonyms

  # Input for creating a synonym.
  #
  # @example
  #   {
  #     "root" => "laptop",
  #     "synonyms" => ["notebook", "ultrabook"],
  #     "locale" => "en"
  #   }
  module CreateSynonymInput
    OPTIONAL = %w[root synonyms locale].freeze
  end

  # @!endgroup

  # @!group Curations

  # Input for creating a curation.
  #
  # @example
  #   {
  #     "query" => "laptop",
  #     "pinnedIds" => ["doc_1", "doc_2"],
  #     "hiddenIds" => ["doc_3"],
  #     "boostedIds" => ["doc_1"]
  #   }
  module CreateCurationInput
    OPTIONAL = %w[query pinnedIds hiddenIds boostedIds].freeze
  end

  # @!endgroup

  # @!group Error

  # Extended v2 error response format.
  #
  # @example
  #   {
  #     "requestId" => "req_abc123",
  #     "error" => "not_found",
  #     "message" => "Index not found",
  #     "statusCode" => 404,
  #     "details" => [
  #       { "code" => "resource_missing", "message" => "...", "path" => ["indexId"] }
  #     ],
  #     "documentationUrl" => "https://docs.aacsearch.com/api/v2/errors#not_found"
  #   }
  module V2Error
    REQUIRED = %w[requestId error message statusCode].freeze
    OPTIONAL = %w[details documentationUrl].freeze
  end

  # @!endgroup

  # @!group Analytics / Usage

  # Analytics data returned by GET /api/v2/projects/{projectId}/analytics.
  #
  # @example Response shape
  #   {
  #     "totalSearches" => 50000,
  #     "totalSessions" => 12000,
  #     "topQueries" => [ { "query" => "laptop", "count" => 500 } ],
  #     "zeroResultQueries" => [ { "query" => "xyzzy", "count" => 10 } ],
  #     "topClickedProducts" => [ { "productId" => "doc_1", "title" => "Laptop", "clicks" => 200 } ],
  #     "ctr" => 0.15,
  #     "searchesOverTime" => [ { "date" => "2025-06-01", "count" => 1500 } ]
  #   }
  module AnalyticsResult
    OPTIONAL = %w[totalSearches totalSessions topQueries zeroResultQueries topClickedProducts ctr searchesOverTime].freeze
  end

  # Usage data returned by GET /api/v2/projects/{projectId}/usage.
  #
  # @example Response shape
  #   {
  #     "since" => "2025-01-01T00:00:00Z",
  #     "rows" => [
  #       { "type" => "search", "totalCount" => 50000, "since" => "2025-01-01T00:00:00Z" },
  #       { "type" => "indexing", "totalCount" => 2000, "since" => "2025-01-01T00:00:00Z" }
  #     ]
  #   }
  module UsageResult
    OPTIONAL = %w[since rows].freeze
  end

  # @!endgroup
end
