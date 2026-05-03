import Foundation

// MARK: - Search

public struct SearchResponse: Codable, Sendable {
    public let hits: [Hit]
    public let found: Int
    public let page: Int
    public let perPage: Int
    public let facetCounts: [String: [FacetCount]]?
    public let searchTimeMs: Int?

    enum CodingKeys: String, CodingKey {
        case hits, found, page, perPage, facetCounts, searchTimeMs
    }
}

public struct Hit: Codable, Sendable {
    public let document: [String: AnyValue]
    public let highlight: [String: AnyValue]?
    public let textMatch: Int?

    enum CodingKeys: String, CodingKey {
        case document, highlight, textMatch
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        document = try container.decode([String: AnyValue].self, forKey: .document)
        highlight = try container.decodeIfPresent([String: AnyValue].self, forKey: .highlight)
        textMatch = try container.decodeIfPresent(Int.self, forKey: .textMatch)
    }
}

public struct FacetCount: Codable, Sendable {
    public let value: String
    public let count: Int
}

public struct MultiSearchQuery: Codable, Sendable {
    public let q: String
    public let queryBy: String?
    public let filterBy: String?
    public let sortBy: String?
    public let perPage: Int?
    public let page: Int?

    public init(
        q: String = "*",
        queryBy: String? = nil,
        filterBy: String? = nil,
        sortBy: String? = nil,
        perPage: Int? = nil,
        page: Int? = nil
    ) {
        self.q = q
        self.queryBy = queryBy
        self.filterBy = filterBy
        self.sortBy = sortBy
        self.perPage = perPage
        self.page = page
    }

    var asDictionary: [String: Any] {
        var dict: [String: Any] = ["q": q]
        if let queryBy { dict["queryBy"] = queryBy }
        if let filterBy { dict["filterBy"] = filterBy }
        if let sortBy { dict["sortBy"] = sortBy }
        if let perPage { dict["perPage"] = perPage }
        if let page { dict["page"] = page }
        return dict
    }
}

public struct MultiSearchResponse: Codable, Sendable {
    public let results: [SearchResponse]
}

// MARK: - Documents

public struct DocumentOperationResult: Codable, Sendable {
    public let id: String
    public let queued: Bool
}

public struct BatchOperationResult: Codable, Sendable {
    public let queued: Int
    public let accepted: Int
}

public struct DocumentDeleteResult: Codable, Sendable {
    public let id: String
    public let deleted: Bool
}

// MARK: - Indexes

public struct SearchIndex: Codable, Sendable {
    public let id: String
    public let slug: String
    public let displayName: String
    public let version: Int
    public let enabled: Bool
    public let apiKeysCount: Int?
    public let createdAt: String
    public let updatedAt: String
}

public struct IndexStats: Codable, Sendable {
    public let id: String
    public let slug: String
    public let displayName: String
    public let documentCount: Int
    public let usage: IndexUsage?
    public let ingestQueue: IngestQueue?
    public let createdAt: String
}

public struct IndexUsage: Codable, Sendable {
    public let totalSearches: Int
    public let totalIndexed: Int
}

public struct IngestQueue: Codable, Sendable {
    public let pending: Int
    public let failed: Int
}

// MARK: - Synonyms

public struct Synonym: Codable, Sendable {
    public let id: String
    public let root: String
    public let synonyms: [String]
}

// MARK: - Curations

public struct Curation: Codable, Sendable {
    public let id: String
    public let query: String
    public let pinnedIds: [String]?
    public let hiddenIds: [String]?
}

// MARK: - Common

public struct DeleteResult: Codable, Sendable {
    public let id: String
    public let deleted: Bool
}

// MARK: - AnyValue (type-erased Codable)

public enum AnyValue: Codable, Sendable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case array([AnyValue])
    case dictionary([String: AnyValue])
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let str = try? container.decode(String.self) {
            self = .string(str)
        } else if let int = try? container.decode(Int.self) {
            self = .int(int)
        } else if let double = try? container.decode(Double.self) {
            self = .double(double)
        } else if let bool = try? container.decode(Bool.self) {
            self = .bool(bool)
        } else if let arr = try? container.decode([AnyValue].self) {
            self = .array(arr)
        } else if let dict = try? container.decode([String: AnyValue].self) {
            self = .dictionary(dict)
        } else if container.decodeNil() {
            self = .null
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported type"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let v): try container.encode(v)
        case .int(let v): try container.encode(v)
        case .double(let v): try container.encode(v)
        case .bool(let v): try container.encode(v)
        case .array(let v): try container.encode(v)
        case .dictionary(let v): try container.encode(v)
        case .null: try container.encodeNil()
        }
    }
}
