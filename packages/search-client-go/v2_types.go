package aacsearch

// ── v2 Search Index ──────────────────────────────────────────────────────

// V2SearchIndex represents a search index in the v2 API.
type V2SearchIndex struct {
	ID            string `json:"id"`
	Slug          string `json:"slug"`
	DisplayName   string `json:"displayName"`
	Enabled       bool   `json:"enabled"`
	ProjectID     string `json:"projectId"`
	DocumentCount int    `json:"documentCount,omitempty"`
	CreatedAt     string `json:"createdAt"`
	UpdatedAt     string `json:"updatedAt"`
}

// ── v2 Search Request / Response ─────────────────────────────────────────

// V2SearchRequest represents a v2 search query request body.
type V2SearchRequest struct {
	Q                   string  `json:"q,omitempty"`
	QueryBy             string  `json:"queryBy,omitempty"`
	FilterBy            string  `json:"filterBy,omitempty"`
	FacetBy             string  `json:"facetBy,omitempty"`
	SortBy              string  `json:"sortBy,omitempty"`
	PerPage             int     `json:"perPage,omitempty"`
	Page                int     `json:"page,omitempty"`
	HighlightFields     string  `json:"highlightFields,omitempty"`
	IncludeFields       string  `json:"includeFields,omitempty"`
	ExcludeFields       string  `json:"excludeFields,omitempty"`
	NumTypos            int     `json:"numTypos,omitempty"`
	Prefix              *bool   `json:"prefix,omitempty"`
	Exact               *bool   `json:"exact,omitempty"`
	PrioritizeExactMatch *bool  `json:"prioritizeExactMatch,omitempty"`
	HybridConfidence    float64 `json:"hybridConfidence,omitempty"`
	CurationTags        string  `json:"curationTags,omitempty"`
	FacetQuery          string  `json:"facetQuery,omitempty"`
	MaxFacetValues      int     `json:"maxFacetValues,omitempty"`
}

// V2MultiSearchItem represents a single search within a v2 multi-search request.
type V2MultiSearchItem struct {
	IndexID string           `json:"indexId"`
	Search  V2SearchRequest `json:"search"`
}

// V2SearchResult represents the response from a v2 search query.
type V2SearchResult struct {
	Hits         []SearchHit  `json:"hits"`
	Found        int          `json:"found"`
	Page         int          `json:"page"`
	PerPage      int          `json:"perPage"`
	FacetCounts  []FacetCount `json:"facetCounts,omitempty"`
	SearchTimeMs int          `json:"searchTimeMs"`
}

// V2MultiSearchResult represents the response from a v2 multi-search.
type V2MultiSearchResult struct {
	Results []V2SearchResult `json:"results"`
}

// ── v2 Documents ─────────────────────────────────────────────────────────

// DocumentAction is the action to take when upserting documents.
type DocumentAction string

const (
	DocumentActionUpsert DocumentAction = "upsert"
	DocumentActionCreate DocumentAction = "create"
	DocumentActionUpdate DocumentAction = "update"
)

// V2UpsertDocumentsInput holds the body for batch upserting documents (v2).
type V2UpsertDocumentsInput struct {
	Documents []map[string]interface{} `json:"documents"`
	Action    DocumentAction           `json:"action,omitempty"`
}

// V2BatchDeleteBody holds the body for batch deleting documents (v2).
type V2BatchDeleteBody struct {
	IDs []string `json:"ids"`
}

// V2ListDocumentsParams holds optional query parameters for listing documents (v2, cursor-based).
type V2ListDocumentsParams struct {
	Cursor   string
	PerPage  int
	FilterBy string
}

// V2BrowseDocumentsResult holds cursor-based paginated document results (v2).
type V2BrowseDocumentsResult struct {
	Hits    []SearchHit `json:"hits"`
	Found   int         `json:"found"`
	Cursor  string      `json:"cursor,omitempty"`
	PerPage int         `json:"perPage"`
	HasMore bool        `json:"hasMore,omitempty"`
}

// V2BatchResult reports the result of a batch document operation (v2).
type V2BatchResult struct {
	Queued   int `json:"queued"`
	Accepted int `json:"accepted"`
}

// ExportFormat is the format for document export.
type ExportFormat string

const (
	ExportFormatJSONL ExportFormat = "jsonl"
	ExportFormatJSON  ExportFormat = "json"
)

// ── v2 Project ───────────────────────────────────────────────────────────

// V2Project represents a project in the v2 API.
type V2Project struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Slug         string  `json:"slug"`
	Logo         *string `json:"logo"`
	MembersCount int     `json:"membersCount"`
	CreatedAt    string  `json:"createdAt"`
	UpdatedAt    string  `json:"updatedAt"`
}

// V2CreateProjectInput holds fields for creating a project (v2).
type V2CreateProjectInput struct {
	Name string  `json:"name"`
	Slug string  `json:"slug"`
	Logo *string `json:"logo,omitempty"`
}

// ── v2 Index Inputs ──────────────────────────────────────────────────────

// V2CreateIndexInput holds fields for creating a search index (v2).
type V2CreateIndexInput struct {
	Slug                string            `json:"slug"`
	DisplayName         string            `json:"displayName"`
	Fields              []FieldDefinition `json:"fields"`
	DefaultSortingField string            `json:"defaultSortingField,omitempty"`
}

// V2UpdateIndexInput holds optional fields for updating an index (v2).
type V2UpdateIndexInput struct {
	DisplayName         *string `json:"displayName,omitempty"`
	Enabled             *bool   `json:"enabled,omitempty"`
	DefaultSortingField *string `json:"defaultSortingField,omitempty"`
}

// V2IndexStats provides statistics about an index (v2).
type V2IndexStats struct {
	ID            string `json:"id"`
	Slug          string `json:"slug"`
	DisplayName   string `json:"displayName"`
	DocumentCount int    `json:"documentCount"`
	Usage         struct {
		Since           string `json:"since"`
		TotalSearches   int    `json:"totalSearches"`
		TotalIndexed    int    `json:"totalIndexed"`
		ZeroResultCount int    `json:"zeroResultCount"`
		ClickCount      int    `json:"clickCount"`
	} `json:"usage"`
	IngestQueue struct {
		Pending int `json:"pending"`
		Failed  int `json:"failed"`
	} `json:"ingestQueue"`
	APIKeysCount int    `json:"apiKeysCount"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

// ── v2 API Keys ──────────────────────────────────────────────────────────

// V2CreateKeyInput holds fields for creating an API key (v2).
type V2CreateKeyInput struct {
	Description        string      `json:"description"`
	Scopes             []KeyScope  `json:"scopes"`
	RateLimitPerMinute *int        `json:"rateLimitPerMinute,omitempty"`
	AllowedOrigins     []string    `json:"allowedOrigins,omitempty"`
}

// V2APIKey represents an API key record in the v2 API.
type V2APIKey struct {
	ID                 string     `json:"id"`
	Description        string     `json:"description"`
	Prefix             string     `json:"prefix"`
	Scopes             []KeyScope `json:"scopes"`
	AllowedOrigins     []string   `json:"allowedOrigins"`
	RateLimitPerMinute *int       `json:"rateLimitPerMinute"`
	ExpiresAt          *string    `json:"expiresAt"`
	RevokedAt          *string    `json:"revokedAt"`
	LastUsedAt         *string    `json:"lastUsedAt"`
	CreatedAt          string     `json:"createdAt"`
}

// V2CreateKeyResult is returned after creating an API key (v2, includes raw key).
type V2CreateKeyResult struct {
	V2APIKey
	RawKey string `json:"rawKey"`
}

// ── v2 Synonyms ──────────────────────────────────────────────────────────

// V2Synonym represents a synonym rule (v2).
type V2Synonym struct {
	ID           string   `json:"id"`
	Root         string   `json:"root"`
	Replacements []string `json:"replacements"`
	Locale       string   `json:"locale,omitempty"`
}

// V2CreateSynonymInput holds fields for creating a synonym (v2).
type V2CreateSynonymInput struct {
	Root         string   `json:"root"`
	Replacements []string `json:"replacements"`
	Locale       string   `json:"locale,omitempty"`
}

// ── v2 Curations ─────────────────────────────────────────────────────────

// V2Curation represents a search curation (v2).
type V2Curation struct {
	ID         string   `json:"id"`
	Query      string   `json:"query"`
	PinnedIDs  []string `json:"pinnedIds"`
	HiddenIDs  []string `json:"hiddenIds"`
	BoostedIDs []string `json:"boostedIds"`
}

// V2CreateCurationInput holds fields for creating a curation (v2).
type V2CreateCurationInput struct {
	Query      string   `json:"query"`
	PinnedIDs  []string `json:"pinnedIds,omitempty"`
	HiddenIDs  []string `json:"hiddenIds,omitempty"`
	BoostedIDs []string `json:"boostedIds,omitempty"`
}

// ── v2 Analytics / Usage ─────────────────────────────────────────────────

// V2AnalyticsResult holds aggregated search analytics (v2).
type V2AnalyticsResult struct {
	TotalSearches     int     `json:"totalSearches"`
	TotalSessions     int     `json:"totalSessions"`
	TopQueries        []struct {
		Query string `json:"query"`
		Count int    `json:"count"`
	} `json:"topQueries"`
	ZeroResultQueries []struct {
		Query string `json:"query"`
		Count int    `json:"count"`
	} `json:"zeroResultQueries"`
	TopClickedProducts []struct {
		ProductID string `json:"productId"`
		Title     string `json:"title"`
		Clicks    int    `json:"clicks"`
	} `json:"topClickedProducts"`
	CTR              float64 `json:"ctr"`
	SearchesOverTime []struct {
		Date  string `json:"date"`
		Count int    `json:"count"`
	} `json:"searchesOverTime"`
}

// V2UsageRow represents a single usage data row (v2).
type V2UsageRow struct {
	Type       string `json:"type"`
	TotalCount int    `json:"totalCount"`
	Since      string `json:"since"`
}

// V2UsageResult holds usage data for a project (v2).
type V2UsageResult struct {
	Since string       `json:"since"`
	Rows  []V2UsageRow `json:"rows"`
}

// ── v2 Error ─────────────────────────────────────────────────────────────

// V2Error is the extended v2 error response format.
type V2Error struct {
	RequestID        string        `json:"requestId"`
	Error            string        `json:"error"`
	Message          string        `json:"message"`
	StatusCode       int           `json:"statusCode"`
	Details          []V2ErrorDetail `json:"details,omitempty"`
	DocumentationURL string        `json:"documentationUrl,omitempty"`
}

// V2ErrorDetail provides structured error details.
type V2ErrorDetail struct {
	Code    string   `json:"code,omitempty"`
	Message string   `json:"message,omitempty"`
	Path    []string `json:"path,omitempty"`
}

// ── Analytics Events ─────────────────────────────────────────────────────

// TrackEventInput holds the payload for tracking an analytics event.
type TrackEventInput struct {
	Event   string                 `json:"event"`
	IndexID string                 `json:"indexId,omitempty"`
	Query   string                 `json:"query,omitempty"`
	DocID   string                 `json:"docId,omitempty"`
	Tags    map[string]interface{} `json:"tags,omitempty"`
	UserID  string                 `json:"userId,omitempty"`
	Session string                 `json:"session,omitempty"`
}
