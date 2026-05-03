# frozen_string_literal: true

# AACsearch Ruby SDK — search-as-a-service client for the v2 API.
#
# Two clients are provided:
# - {Aacsearch::SearchClient}: browser-safe public search client
#   (use with search-scoped keys: ss_search_*).
# - {Aacsearch::AdminClient}: server-side administration client
#   (use with admin-scoped keys: aa_admin_*).
#
# @example Search client
#   require "aacsearch"
#
#   client = Aacsearch::SearchClient.new(
#     base_url: "https://api.aacsearch.com",
#     api_key: "ss_search_abc123"
#   )
#   results = client.search("products", q: "laptop", queryBy: "title")
#
# @example Admin client
#   admin = Aacsearch::AdminClient.new(
#     base_url: "https://api.aacsearch.com",
#     api_key: "aa_admin_abc123"
#   )
#   project = admin.get_project
#   indexes = admin.list_indexes(project["id"])

require_relative "aacsearch/version"
require_relative "aacsearch/types"
require_relative "aacsearch/client"
require_relative "aacsearch/search_client"
require_relative "aacsearch/admin_client"

module Aacsearch
  class << self
    # Create a new {SearchClient} instance.
    #
    # @param base_url [String] The AACsearch API origin URL.
    # @param api_key [String] A search-scoped API key.
    # @param timeout [Integer] Request timeout in seconds.
    # @return [SearchClient]
    def new_search_client(base_url:, api_key:, timeout: Client::DEFAULT_TIMEOUT)
      SearchClient.new(base_url: base_url, api_key: api_key, timeout: timeout)
    end

    # Create a new {AdminClient} instance.
    #
    # @param base_url [String] The AACsearch API origin URL.
    # @param api_key [String] An admin-scoped API key.
    # @param timeout [Integer] Request timeout in seconds.
    # @return [AdminClient]
    def new_admin_client(base_url:, api_key:, timeout: Client::DEFAULT_TIMEOUT)
      AdminClient.new(base_url: base_url, api_key: api_key, timeout: timeout)
    end
  end
end
