# frozen_string_literal: true

require_relative "lib/aacsearch/version"

Gem::Specification.new do |spec|
  spec.name          = "aacsearch"
  spec.version       = Aacsearch::VERSION
  spec.authors       = ["AACsearch"]
  spec.email         = ["support@aacsearch.com"]

  spec.summary       = "Ruby SDK for the AACsearch v2 REST API"
  spec.description   = "AACsearch is a search-as-a-service platform. This gem provides two " \
                       "clients: SearchClient (public, search-only) and AdminClient (server-side, " \
                       "full management). Supports all v2 endpoints including projects, indexes, " \
                       "documents, search, multi-search, API keys, synonyms, curations, analytics, " \
                       "and usage."
  spec.homepage      = "https://github.com/aacsearch/aacsearch-ruby"
  spec.license       = "MIT"

  spec.required_ruby_version = ">= 2.7.0"

  spec.metadata["homepage_uri"]    = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/aacsearch/aacsearch-ruby"
  spec.metadata["changelog_uri"]   = "https://github.com/aacsearch/aacsearch-ruby/blob/main/CHANGELOG.md"

  # Specify which files should be added to the gem when it is released.
  spec.files = Dir[
    "lib/**/*.rb",
    "LICENSE",
    "README.md",
    "CHANGELOG.md"
  ]
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  # No external runtime dependencies — uses Ruby stdlib (net/http, json, uri)
end
