# frozen_string_literal: true

require "json"
require "net/http"
require "uri"

module Aacsearch
  # Base HTTP client with Bearer token authentication.
  #
  # Uses Ruby's standard library Net::HTTP with no external dependencies.
  # Handles JSON serialization/deserialization, error responses, and
  # query parameter encoding.
  class Client
    DEFAULT_TIMEOUT = 30
    USER_AGENT = "aacsearch-ruby-sdk/#{Aacsearch::VERSION}"

    # Create a new client instance.
    #
    # @param base_url [String] Origin of the AACsearch deployment
    #   (e.g. "https://api.aacsearch.com"). The /api/v2 prefix is appended
    #   automatically for all requests — do not include it here.
    # @param api_key [String] AACsearch API key. Use search-scoped keys
    #   (ss_search_*) with {SearchClient} and admin-scoped keys (aa_admin_*)
    #   with {AdminClient}.
    # @param timeout [Integer] HTTP request timeout in seconds (default: 30).
    # @param open_timeout [Integer] Connection open timeout in seconds (default: 10).
    def initialize(base_url:, api_key:, timeout: DEFAULT_TIMEOUT, open_timeout: 10)
      raise ArgumentError, "base_url is required" if base_url.nil? || base_url.empty?
      raise ArgumentError, "api_key is required" if api_key.nil? || api_key.empty?

      @base_url = base_url.sub(%r{/+$}, "")
      @api_key = api_key
      @timeout = timeout
      @open_timeout = open_timeout
    end

    # Perform an HTTP request.
    #
    # @param method [Symbol, String] HTTP method (:get, :post, :put, :patch, :delete)
    # @param path [String] Request path (e.g. "/api/v2/projects")
    # @param body [Hash, Array, nil] Request body — serialized as JSON for
    #   POST/PUT/PATCH. Ignored for GET/DELETE.
    # @param params [Hash{String => String}, nil] URL query parameters
    #   (for GET requests).
    # @return [Hash, Array, nil] Parsed JSON response body. Returns nil for
    #   204 No Content responses.
    # @raise [Aacsearch::Error] On non-2xx responses.
    # @raise [Aacsearch::NetworkError] On network failures.
    def request(method, path, body = nil, params = nil)
      uri = build_uri(path, params)
      http = build_http(uri)

      request_obj = build_request(method, uri, body)

      response = http.request(request_obj)
      handle_response(response)
    rescue Timeout::Error, Errno::EINVAL, Errno::ECONNRESET, EOFError,
           Net::OpenTimeout, Net::ReadTimeout => e
      raise NetworkError, "Network error: #{e.message}"
    end

    private

    def build_uri(path, params = nil)
      uri = URI("#{@base_url}#{path}")
      if params && !params.empty?
        uri.query = encode_params(params)
      end
      uri
    end

    def build_http(uri)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = (uri.scheme == "https")
      http.open_timeout = @open_timeout
      http.read_timeout = @timeout
      http
    end

    def build_request(method, uri, body)
      method = method.to_s.downcase.to_sym

      request = case method
                when :get
                  Net::HTTP::Get.new(uri)
                when :post
                  Net::HTTP::Post.new(uri)
                when :put
                  Net::HTTP::Put.new(uri)
                when :patch
                  Net::HTTP::Patch.new(uri)
                when :delete
                  Net::HTTP::Delete.new(uri)
                else
                  raise ArgumentError, "Unsupported HTTP method: #{method}"
                end

      request["Authorization"] = "Bearer #{@api_key}"
      request["Content-Type"] = "application/json"
      request["User-Agent"] = USER_AGENT
      request["Accept"] = "application/json"

      if body && !%i[get delete].include?(method)
        request.body = JSON.generate(body)
      end

      request
    end

    def handle_response(response)
      case response
      when Net::HTTPNoContent
        nil
      when Net::HTTPSuccess
        return nil if response.body.nil? || response.body.empty?

        JSON.parse(response.body)
      else
        error_body = parse_error_body(response.body)
        raise Error.new(
          error_body&.dig("error") || "http_error",
          error_body&.dig("message") || response.message || "Unknown error",
          response.code.to_i,
          request_id: error_body&.dig("requestId"),
          details: error_body&.dig("details"),
          documentation_url: error_body&.dig("documentationUrl"),
          response: response
        )
      end
    rescue JSON::ParserError => e
      raise Error.new("parse_error", "Failed to parse response: #{e.message}", response.code.to_i, response: response)
    end

    def parse_error_body(body)
      return nil if body.nil? || body.empty?
      JSON.parse(body)
    rescue JSON::ParserError
      nil
    end

    def encode_params(params)
      params.map do |key, value|
        "#{CGI.escape(key.to_s)}=#{CGI.escape(value.to_s)}"
      end.join("&")
    end
  end

  # Generic AACsearch API error.
  class Error < StandardError
    # @return [String] Machine-readable error code (e.g. "not_found", "unauthorized")
    attr_reader :code

    # @return [Integer] HTTP status code
    attr_reader :status_code

    # @return [String, nil] Unique request ID for tracing
    attr_reader :request_id

    # @return [Array<Hash>, nil] Structured error details (validation errors, etc.)
    attr_reader :details

    # @return [String, nil] Link to API documentation for this error
    attr_reader :documentation_url

    # @return [Net::HTTPResponse, nil] The raw HTTP response
    attr_reader :response

    def initialize(code, message, status_code, request_id: nil, details: nil, documentation_url: nil, response: nil)
      @code = code
      @status_code = status_code
      @request_id = request_id
      @details = details
      @documentation_url = documentation_url
      @response = response
      super(message)
    end

    # Human-readable string representation.
    def to_s
      s = "[#{status_code}] #{code}: #{message}"
      s += " (requestId: #{request_id})" if request_id
      s
    end
  end

  # Network-level error (timeout, connection refused, etc.)
  class NetworkError < Error
    def initialize(message)
      super("network_error", message, 0)
    end
  end
end
