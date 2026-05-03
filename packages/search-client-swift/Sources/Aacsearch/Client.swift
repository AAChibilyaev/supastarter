import Foundation

// MARK: - Configuration

/// Configuration for the AACsearch API client.
public struct AacsearchConfig {
    /// The base URL of the AACsearch API (e.g. "https://api.aacsearch.com").
    public let baseURL: String

    /// The API key for authentication.
    public let apiKey: String

    /// Timeout interval for requests (default: 30 seconds).
    public let timeout: TimeInterval

    public init(
        baseURL: String = "https://api.aacsearch.com",
        apiKey: String,
        timeout: TimeInterval = 30
    ) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        self.timeout = timeout
    }
}

// MARK: - Errors

/// Errors that can occur during API calls.
public enum AacsearchError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case decodingError(Error)
    case httpError(statusCode: Int, message: String)
    case unauthorized
    case notFound
    case rateLimited
    case serverError

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Failed to parse response: \(error.localizedDescription)"
        case .httpError(let code, let message):
            return "HTTP \(code): \(message)"
        case .unauthorized:
            return "Invalid or missing API key"
        case .notFound:
            return "Resource not found"
        case .rateLimited:
            return "Rate limit exceeded"
        case .serverError:
            return "Server error"
        }
    }
}

// MARK: - Client

/// Main client for the AACsearch API.
///
/// ```swift
/// let client = AacsearchClient(apiKey: "ss_search_xxx")
/// let results = try await client.search("products", query: "nike")
/// ```
public final class AacsearchClient: @unchecked Sendable {
    private let config: AacsearchConfig
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    public init(config: AacsearchConfig) {
        self.config = config
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = config.timeout
        configuration.httpAdditionalHeaders = [
            "Authorization": "Bearer \(config.apiKey)",
            "Content-Type": "application/json",
            "Accept": "application/json",
        ]
        self.session = URLSession(configuration: configuration)
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    public convenience init(apiKey: String) {
        self.init(config: AacsearchConfig(apiKey: apiKey))
    }

    // MARK: - Search

    /// Search a single index.
    /// - Parameters:
    ///   - indexId: The index slug or ID.
    ///   - query: The search query string.
    ///   - queryBy: Comma-separated fields to search in.
    ///   - filterBy: Typesense filter expression.
    ///   - sortBy: Sort field and direction.
    ///   - page: Page number (1-indexed).
    ///   - perPage: Results per page (max 100).
    /// - Returns: Search results with hits and metadata.
    @discardableResult
    public func search(
        _ indexId: String,
        query: String = "*",
        queryBy: String? = nil,
        filterBy: String? = nil,
        sortBy: String? = nil,
        facetBy: String? = nil,
        page: Int = 1,
        perPage: Int = 20
    ) async throws -> SearchResponse {
        var body: [String: Any] = ["q": query, "page": page, "perPage": perPage]
        if let queryBy { body["queryBy"] = queryBy }
        if let filterBy { body["filterBy"] = filterBy }
        if let sortBy { body["sortBy"] = sortBy }
        if let facetBy { body["facetBy"] = facetBy }

        return try await post("/indexes/\(indexId)/search", body: body)
    }

    /// Multi-search across an index with multiple queries.
    public func multiSearch(
        searches: [MultiSearchQuery]
    ) async throws -> MultiSearchResponse {
        try await post("/multi-search", body: ["searches": searches.map(\.asDictionary)])
    }

    // MARK: - Documents

    /// Upsert a single document.
    @discardableResult
    public func upsertDocument(
        _ indexId: String,
        document: [String: Any]
    ) async throws -> DocumentOperationResult {
        try await put("/indexes/\(indexId)/documents/\(document["id"] ?? "")", body: document)
    }

    /// Batch upsert documents.
    @discardableResult
    public func batchUpsertDocuments(
        _ indexId: String,
        documents: [[String: Any]]
    ) async throws -> BatchOperationResult {
        try await post("/indexes/\(indexId)/documents:batch", body: ["documents": documents])
    }

    /// Delete a document by ID.
    @discardableResult
    public func deleteDocument(
        _ indexId: String,
        documentId: String
    ) async throws -> DocumentDeleteResult {
        try await delete("/indexes/\(indexId)/documents/\(documentId)")
    }

    // MARK: - Indexes

    /// List all indexes in a project.
    public func listIndexes(projectId: String) async throws -> [SearchIndex] {
        try await get("/projects/\(projectId)/indexes")
    }

    /// Get index statistics.
    public func getIndexStats(_ indexId: String) async throws -> IndexStats {
        try await get("/indexes/\(indexId)/stats")
    }

    // MARK: - Synonyms

    /// List synonyms for an index.
    public func listSynonyms(_ indexId: String) async throws -> [Synonym] {
        try await get("/indexes/\(indexId)/synonyms")
    }

    /// Create a synonym.
    @discardableResult
    public func createSynonym(
        _ indexId: String,
        root: String,
        synonym: String
    ) async throws -> Synonym {
        try await post("/indexes/\(indexId)/synonyms", body: ["root": root, "synonym": synonym])
    }

    /// Delete a synonym.
    @discardableResult
    public func deleteSynonym(
        _ indexId: String,
        synonymId: String
    ) async throws -> DeleteResult {
        try await delete("/indexes/\(indexId)/synonyms/\(synonymId)")
    }

    // MARK: - Curations

    /// List curations for an index.
    public func listCurations(_ indexId: String) async throws -> [Curation] {
        try await get("/indexes/\(indexId)/curations")
    }

    // MARK: - Private HTTP Methods

    private func get<T: Decodable>(_ path: String) async throws -> T {
        var request = try makeRequest(path)
        request.httpMethod = "GET"
        return try await perform(request)
    }

    private func post<T: Decodable>(_ path: String, body: Any) async throws -> T {
        var request = try makeRequest(path)
        request.httpMethod = "POST"
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await perform(request)
    }

    private func put<T: Decodable>(_ path: String, body: Any) async throws -> T {
        var request = try makeRequest(path)
        request.httpMethod = "PUT"
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await perform(request)
    }

    private func delete<T: Decodable>(_ path: String) async throws -> T {
        var request = try makeRequest(path)
        request.httpMethod = "DELETE"
        return try await perform(request)
    }

    private func makeRequest(_ path: String) throws -> URLRequest {
        guard let url = URL(string: "\(config.baseURL)/api/v1\(path)") else {
            throw AacsearchError.invalidURL
        }
        return URLRequest(url: url)
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw AacsearchError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AacsearchError.serverError
        }

        switch httpResponse.statusCode {
        case 200...299:
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                // Fallback: try JSON dictionary
                if let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let dictResult = dict as? T {
                    return dictResult
                }
                throw AacsearchError.decodingError(error)
            }
        case 401:
            throw AacsearchError.unauthorized
        case 403:
            throw AacsearchError.unauthorized
        case 404:
            throw AacsearchError.notFound
        case 429:
            throw AacsearchError.rateLimited
        case 500...599:
            throw AacsearchError.serverError
        default:
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw AacsearchError.httpError(statusCode: httpResponse.statusCode, message: message)
        }
    }
}
