# frozen_string_literal: true

require_relative "client"

module Aacsearch
  # Server-side administration client for the AACsearch v2 REST API.
  #
  # Requires an admin-scope API key (aa_admin_*). Never bundle in browser
  # or mobile application code.
  #
  # Provides full CRUD for projects, indexes, documents, API keys, synonyms,
  # curations, and read-only access to analytics and usage data.
  #
  # @example
  #   admin = Aacsearch::AdminClient.new(
  #     base_url: "https://api.aacsearch.com",
  #     api_key: "aa_admin_abc123"
  #   )
  #
  #   # Get current project
  #   project = admin.get_project
  #
  #   # List indexes in a project
  #   indexes = admin.list_indexes(project["id"])
  class AdminClient
    # Create a new v2 admin client.
    #
    # @param base_url [String] Origin of the AACsearch deployment
    #   (e.g. "https://api.aacsearch.com").
    # @param api_key [String] An admin-scope API key (aa_admin_*).
    # @param timeout [Integer] HTTP request timeout in seconds (default: 30).
    def initialize(base_url:, api_key:, timeout: Client::DEFAULT_TIMEOUT)
      @client = Client.new(base_url: base_url, api_key: api_key, timeout: timeout)
    end

    # ── Project operations ──────────────────────────────────────────────────

    # Get the current project (organization) details.
    #
    # GET /api/v2/projects
    #
    # @return [Hash] Project details (see {ProjectFields}).
    def get_project
      @client.request(:get, "/api/v2/projects")
    end

    # Create a new project (organization).
    #
    # POST /api/v2/projects
    #
    # @param name [String] Display name (max 120 chars).
    # @param slug [String] URL-safe identifier (lowercase, digits, hyphens).
    # @param logo [String, nil] Optional URL to project logo image.
    # @return [Hash] Created project details.
    def create_project(name, slug, logo: nil)
      body = { "name" => name, "slug" => slug }
      body["logo"] = logo if logo
      @client.request(:post, "/api/v2/projects", body)
    end

    # Get a project by its ID.
    #
    # GET /api/v2/projects/{projectId}
    #
    # @param project_id [String] The project ID.
    # @return [Hash] Project details.
    def get_project_by_id(project_id)
      @client.request(:get, "/api/v2/projects/#{url_encode(project_id)}")
    end

    # ── Index operations ────────────────────────────────────────────────────

    # List all search indexes in a project.
    #
    # GET /api/v2/projects/{projectId}/indexes
    #
    # @param project_id [String] The project ID.
    # @return [Array<Hash>] List of search indexes.
    def list_indexes(project_id)
      @client.request(:get, "/api/v2/projects/#{url_encode(project_id)}/indexes")
    end

    # Create a new search index.
    #
    # POST /api/v2/projects/{projectId}/indexes
    #
    # @param project_id [String] The project ID.
    # @param slug [String] URL-safe index identifier.
    # @param display_name [String] Human-readable name (max 120 chars).
    # @param fields [Array<Hash>] Array of field definitions. Each field
    #   requires +name+ and +type+; may include +facet+, +index+, +optional+,
    #   +locale+, +sort+, +infix+, +numDimensions+.
    # @param default_sorting_field [String, nil] Optional default sort field.
    # @return [Hash] Created search index details.
    def create_index(project_id, slug, display_name, fields, default_sorting_field: nil)
      body = { "slug" => slug, "displayName" => display_name, "fields" => fields }
      body["defaultSortingField"] = default_sorting_field if default_sorting_field
      @client.request(:post, "/api/v2/projects/#{url_encode(project_id)}/indexes", body)
    end

    # Get a single search index by its ID.
    #
    # GET /api/v2/indexes/{indexId}
    #
    # @param index_id [String] The index ID.
    # @return [Hash] Index details.
    def get_index(index_id)
      @client.request(:get, "/api/v2/indexes/#{url_encode(index_id)}")
    end

    # Update index metadata.
    #
    # PATCH /api/v2/indexes/{indexId}
    #
    # @param index_id [String] The index ID.
    # @param display_name [String, nil] New display name.
    # @param enabled [Boolean, nil] Whether the index is enabled.
    # @param default_sorting_field [String, nil] New default sort field.
    # @return [Hash] Updated index details.
    def update_index(index_id, display_name: nil, enabled: nil, default_sorting_field: nil)
      body = {}
      body["displayName"] = display_name unless display_name.nil?
      body["enabled"] = enabled unless enabled.nil?
      body["defaultSortingField"] = default_sorting_field unless default_sorting_field.nil?
      @client.request(:patch, "/api/v2/indexes/#{url_encode(index_id)}", body)
    end

    # Permanently delete a search index and its Typesense collection.
    #
    # DELETE /api/v2/indexes/{indexId}
    #
    # @param index_id [String] The index ID.
    # @return [Hash, nil] Response body (may be nil for 204).
    def delete_index(index_id)
      @client.request(:delete, "/api/v2/indexes/#{url_encode(index_id)}")
    end

    # Get index statistics (document count, usage, ingest queue).
    #
    # GET /api/v2/indexes/{indexId}/stats
    #
    # @param index_id [String] The index ID.
    # @return [Hash] Index statistics.
    def get_index_stats(index_id)
      @client.request(:get, "/api/v2/indexes/#{url_encode(index_id)}/stats")
    end

    # ── Document operations (v2, cursor-based pagination) ───────────────────

    # List documents in an index with cursor-based pagination.
    #
    # GET /api/v2/indexes/{indexId}/documents
    #
    # @param index_id [String] The index ID.
    # @param cursor [String, nil] Pagination cursor from previous response.
    # @param per_page [Integer, nil] Results per page (max 100, default 20).
    # @param filter_by [String, nil] Typesense filter expression.
    # @return [Hash] Paginated document list with +hits+, +found+, +cursor+.
    def list_documents(index_id, cursor: nil, per_page: nil, filter_by: nil)
      params = {}
      params["cursor"] = cursor if cursor
      params["perPage"] = per_page.to_s if per_page
      params["filterBy"] = filter_by if filter_by
      @client.request(:get, "/api/v2/indexes/#{url_encode(index_id)}/documents", nil, params)
    end

    # Upsert documents into an index (batch, async via ingest buffer).
    #
    # POST /api/v2/indexes/{indexId}/documents
    #
    # @param index_id [String] The index ID.
    # @param documents [Array<Hash>] Array of document objects. Each should
    #   have a unique +id+ field.
    # @param action [String] Import action: +"upsert"+ (default), +"create"+,
    #   or +"update"+.
    # @return [Hash] Response with queued/accepted counts.
    def upsert_documents(index_id, documents, action: "upsert")
      body = { "documents" => documents, "action" => action }
      @client.request(:post, "/api/v2/indexes/#{url_encode(index_id)}/documents", body)
    end

    # Get a single document by its ID.
    #
    # GET /api/v2/indexes/{indexId}/documents/{documentId}
    #
    # @param index_id [String] The index ID.
    # @param document_id [String] The document ID.
    # @return [Hash] Document content.
    def get_document(index_id, document_id)
      @client.request(:get, "/api/v2/indexes/#{url_encode(index_id)}/documents/#{url_encode(document_id)}")
    end

    # Upsert a single document.
    #
    # PUT /api/v2/indexes/{indexId}/documents/{documentId}
    #
    # @param index_id [String] The index ID.
    # @param document_id [String] The document ID.
    # @param data [Hash] Document data (does not need to include +id+).
    # @return [Hash] Upserted document.
    def upsert_document(index_id, document_id, data)
      @client.request(:put, "/api/v2/indexes/#{url_encode(index_id)}/documents/#{url_encode(document_id)}", data)
    end

    # Delete a single document by its ID.
    #
    # DELETE /api/v2/indexes/{indexId}/documents/{documentId}
    #
    # @param index_id [String] The index ID.
    # @param document_id [String] The document ID.
    # @return [Hash, nil] Response body.
    def delete_document(index_id, document_id)
      @client.request(:delete, "/api/v2/indexes/#{url_encode(index_id)}/documents/#{url_encode(document_id)}")
    end

    # Batch delete documents by their IDs.
    #
    # POST /api/v2/indexes/{indexId}/documents:batchDelete
    #
    # @param index_id [String] The index ID.
    # @param ids [Array<String>] Array of document IDs to delete.
    # @return [Hash] Deletion result.
    def batch_delete_documents(index_id, ids)
      body = { "ids" => ids }
      @client.request(:post, "/api/v2/indexes/#{url_encode(index_id)}/documents:batchDelete", body)
    end

    # Export documents from an index.
    #
    # GET /api/v2/indexes/{indexId}/documents:export
    #
    # @param index_id [String] The index ID.
    # @param format [String] Export format: +"jsonl"+ (default) or +"json"+.
    # @param filter_by [String, nil] Optional Typesense filter expression.
    # @return [Array, String] Exported documents.
    def export_documents(index_id, format: "jsonl", filter_by: nil)
      params = { "format" => format }
      params["filterBy"] = filter_by if filter_by
      @client.request(:get, "/api/v2/indexes/#{url_encode(index_id)}/documents:export", nil, params)
    end

    # ── Search (admin, requires search-scoped key) ──────────────────────────

    # Search an index (requires a key with search scope).
    #
    # POST /api/v2/indexes/{indexId}/search
    #
    # @param index_id [String] The index ID or slug.
    # @param params [Hash] Search parameters (same as {SearchClient#search}).
    # @return [Hash] Search results.
    def search(index_id, params = {})
      body = params.empty? ? { "q" => "*" } : params
      @client.request(:post, "/api/v2/indexes/#{url_encode(index_id)}/search", body)
    end

    # Execute multiple search queries in a single request.
    #
    # POST /api/v2/multi-search
    #
    # @param searches [Array<Hash>] List of search definitions.
    # @return [Hash] Combined search results.
    def multi_search(searches)
      @client.request(:post, "/api/v2/multi-search", searches)
    end

    # ── API Key operations ──────────────────────────────────────────────────

    # List all API keys in the project.
    #
    # GET /api/v2/projects/{projectId}/keys
    #
    # @param project_id [String] The project ID.
    # @return [Array<Hash>] List of API keys.
    def list_keys(project_id)
      @client.request(:get, "/api/v2/projects/#{url_encode(project_id)}/keys")
    end

    # Create a new API key for the project.
    #
    # POST /api/v2/projects/{projectId}/keys
    #
    # @param project_id [String] The project ID.
    # @param description [String] Human-readable key description.
    # @param scopes [Array<String>] Permission scopes (e.g. +["search"]+,
    #   +["ingest"]+, +["admin"]+).
    # @param rate_limit_per_minute [Integer, nil] Optional rate limit override.
    # @param allowed_origins [Array<String>, nil] Optional CORS origins.
    # @return [Hash] Created API key (includes +rawKey+ shown once).
    def create_key(project_id, description, scopes, rate_limit_per_minute: nil, allowed_origins: nil)
      body = { "description" => description, "scopes" => scopes }
      body["rateLimitPerMinute"] = rate_limit_per_minute if rate_limit_per_minute
      body["allowedOrigins"] = allowed_origins if allowed_origins
      @client.request(:post, "/api/v2/projects/#{url_encode(project_id)}/keys", body)
    end

    # Revoke an API key by its ID.
    #
    # DELETE /api/v2/keys/{keyId}
    #
    # @param key_id [String] The API key ID.
    # @return [Hash, nil] Revocation result.
    def revoke_key(key_id)
      @client.request(:delete, "/api/v2/keys/#{url_encode(key_id)}")
    end

    # ── Synonym operations (v2) ─────────────────────────────────────────────

    # List all synonyms for an index.
    #
    # GET /api/v2/indexes/{indexId}/synonyms
    #
    # @param index_id [String] The index ID.
    # @return [Array<Hash>] List of synonyms.
    def list_synonyms(index_id)
      @client.request(:get, "/api/v2/indexes/#{url_encode(index_id)}/synonyms")
    end

    # Create a synonym for an index.
    #
    # POST /api/v2/indexes/{indexId}/synonyms
    #
    # @param index_id [String] The index ID.
    # @param synonym [Hash] Synonym definition with +root+, +synonyms+, +locale+.
    # @return [Hash] Created synonym.
    def create_synonym(index_id, synonym)
      @client.request(:post, "/api/v2/indexes/#{url_encode(index_id)}/synonyms", synonym)
    end

    # Upsert (batch replace) all synonyms for an index.
    #
    # PUT /api/v2/indexes/{indexId}/synonyms
    #
    # @param index_id [String] The index ID.
    # @param synonyms [Array<Hash>] Array of synonym definitions.
    # @return [Array<Hash>] Upserted synonyms.
    def upsert_synonyms(index_id, synonyms)
      @client.request(:put, "/api/v2/indexes/#{url_encode(index_id)}/synonyms", synonyms)
    end

    # Delete a synonym by its ID.
    #
    # DELETE /api/v2/indexes/{indexId}/synonyms?synonymId={synonymId}
    #
    # @param index_id [String] The index ID.
    # @param synonym_id [String] The synonym ID to delete.
    # @return [Hash, nil] Deletion result.
    def delete_synonym(index_id, synonym_id)
      params = { "synonymId" => synonym_id }
      @client.request(:delete, "/api/v2/indexes/#{url_encode(index_id)}/synonyms", nil, params)
    end

    # ── Curation operations (v2) ────────────────────────────────────────────

    # List all curations (search overrides) for an index.
    #
    # GET /api/v2/indexes/{indexId}/curations
    #
    # @param index_id [String] The index ID.
    # @return [Array<Hash>] List of curations.
    def list_curations(index_id)
      @client.request(:get, "/api/v2/indexes/#{url_encode(index_id)}/curations")
    end

    # Create a curation (search override) for an index.
    #
    # POST /api/v2/indexes/{indexId}/curations
    #
    # @param index_id [String] The index ID.
    # @param curation [Hash] Curation definition with +query+, +pinnedIds+,
    #   +hiddenIds+, +boostedIds+.
    # @return [Hash] Created curation.
    def create_curation(index_id, curation)
      @client.request(:post, "/api/v2/indexes/#{url_encode(index_id)}/curations", curation)
    end

    # Upsert (batch replace) all curations for an index.
    #
    # PUT /api/v2/indexes/{indexId}/curations
    #
    # @param index_id [String] The index ID.
    # @param curations [Array<Hash>] Array of curation definitions.
    # @return [Array<Hash>] Upserted curations.
    def upsert_curations(index_id, curations)
      @client.request(:put, "/api/v2/indexes/#{url_encode(index_id)}/curations", curations)
    end

    # ── Analytics ───────────────────────────────────────────────────────────

    # Get aggregated search analytics for the project.
    #
    # GET /api/v2/projects/{projectId}/analytics
    #
    # @param project_id [String] The project ID.
    # @return [Hash] Analytics data (total searches, top queries, CTR, etc.).
    def get_analytics(project_id)
      @client.request(:get, "/api/v2/projects/#{url_encode(project_id)}/analytics")
    end

    # ── Usage ───────────────────────────────────────────────────────────────

    # Get usage data for the project.
    #
    # GET /api/v2/projects/{projectId}/usage
    #
    # @param project_id [String] The project ID.
    # @return [Hash] Usage data with rows of type/count/since.
    def get_usage(project_id)
      @client.request(:get, "/api/v2/projects/#{url_encode(project_id)}/usage")
    end

    private

    def url_encode(str)
      URI.encode_www_form_component(str.to_s)
    end
  end
end
