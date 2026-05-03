# frozen_string_literal: true

require_relative "client"

module Aacsearch
  # Browser-safe public search client for the AACsearch v2 API.
  #
  # Use with search-scoped API keys (ss_search_*) or scoped tokens
  # (ss_scoped_*). Never bundle admin/write keys in frontend code.
  #
  # @example Basic usage
  #   client = Aacsearch::SearchClient.new(
  #     base_url: "https://api.aacsearch.com",
  #     api_key: "ss_search_abc123"
  #   )
  #
  #   # Search a specific index
  #   results = client.search("products", q: "laptop", queryBy: "title")
  #
  #   # Multi-search across indexes
  #   results = client.multi_search([
  #     { indexId: "products", search: { q: "laptop" } },
  #     { indexId: "blog", search: { q: "ruby" } }
  #   ])
  class SearchClient
    # Create a new v2 search client.
    #
    # @param base_url [String] Origin of the AACsearch deployment
    #   (e.g. "https://api.aacsearch.com").
    # @param api_key [String] A search-scope API key (ss_search_*).
    # @param timeout [Integer] HTTP request timeout in seconds (default: 30).
    def initialize(base_url:, api_key:, timeout: Client::DEFAULT_TIMEOUT)
      @client = Client.new(base_url: base_url, api_key: api_key, timeout: timeout)
    end

    # Search an index with full query parameters.
    #
    # POST /api/v2/indexes/{indexId}/search
    #
    # @param index_slug [String] The index slug or ID to search against.
    # @param params [Hash] Search parameters. See {SearchRequest} for
    #   supported fields (q, queryBy, filterBy, facetBy, sortBy, perPage,
    #   page, highlightFields, includeFields, excludeFields, numTypos,
    #   prefix, exact, prioritizeExactMatch, hybridConfidence, curationTags).
    #   Defaults to { q: "*" } for a wildcard search.
    # @return [Hash] Search results with hits, facets, etc.
    def search(index_slug, params = {})
      body = params.empty? ? { "q" => "*" } : params
      @client.request(:post, "/api/v2/indexes/#{url_encode(index_slug)}/search", body)
    end

    # Execute multiple search queries across indexes in a single request.
    #
    # POST /api/v2/multi-search
    #
    # @param searches [Array<Hash>] List of search definitions. Each must
    #   contain an +indexId+ (slug or ID) and a +search+ hash (same shape
    #   as the +params+ argument of {#search}).
    # @return [Hash] Combined multi-search response with results per query.
    #
    # @example
    #   client.multi_search([
    #     { indexId: "products", search: { q: "laptop", perPage: 5 } },
    #     { indexId: "articles", search: { q: "tech", perPage: 3 } }
    #   ])
    def multi_search(searches)
      @client.request(:post, "/api/v2/multi-search", searches)
    end

    private

    def url_encode(str)
      URI.encode_www_form_component(str.to_s)
    end
  end
end
