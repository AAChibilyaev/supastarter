package aacsearch

// ── SDK Error ────────────────────────────────────────────────────────────

// SDKError represents an error returned by the AACSearch API.
type SDKError struct {
	Code    string
	Status  int
	Message string
	Details interface{}
}

func (e *SDKError) Error() string {
	return e.Message
}

// ── Search ───────────────────────────────────────────────────────────────

// SearchParams represents search query parameters.
type SearchParams struct {
	Q                  string `json:"q,omitempty"`
	QueryBy            string `json:"queryBy,omitempty"`
	FilterBy           string `json:"filterBy,omitempty"`
	FacetBy            string `json:"facetBy,omitempty"`
	SortBy             string `json:"sortBy,omitempty"`
	PerPage            int    `json:"perPage,omitempty"`
	Page               int    `json:"page,omitempty"`
	HighlightFields    string `json:"highlightFields,omitempty"`
	NumTypos           int    `json:"numTypos,omitempty"`
	TypoTokensThreshold int   `json:"typoTokensThreshold,omitempty"`
	DropTokensThreshold int   `json:"dropTokensThreshold,omitempty"`
	Exact              string `json:"exact,omitempty"`
	PrioritizeExactMatch *bool `json:"prioritizeExactMatch,omitempty"`
	Prefix             string `json:"prefix,omitempty"`
	Infix              string `json:"infix,omitempty"`
	QueryByWeights     string `json:"queryByWeights,omitempty"`
	ExcludeFields      string `json:"excludeFields,omitempty"`
	HighlightStartTag  string `json:"highlightStartTag,omitempty"`
	HighlightEndTag    string `json:"highlightEndTag,omitempty"`
	CurationTags       string `json:"curationTags,omitempty"`
	HybridConfidence   float64 `json:"hybridConfidence,omitempty"`
	FacetQuery         string `json:"facetQuery,omitempty"`
	MaxFacetValues     int    `json:"maxFacetValues,omitempty"`
}

// SearchHit represents a single search result hit.
type SearchHit struct {
	Document   map[string]interface{} `json:"document"`
	Highlights []interface{}          `json:"highlights,omitempty"`
}

// FacetCount represents counts for a facet field.
type FacetCount struct {
	FieldName string `json:"field_name"`
	Counts    []struct {
		Value string `json:"value"`
		Count int    `json:"count"`
	} `json:"counts"`
}

// SearchResult represents the response from a search query.
type SearchResult struct {
	Hits         []SearchHit  `json:"hits"`
	Found        int          `json:"found"`
	Page         int          `json:"page"`
	PerPage      int          `json:"perPage"`
	FacetCounts  []FacetCount `json:"facetCounts,omitempty"`
	SearchTimeMs int          `json:"searchTimeMs"`
}

// MultiSearchRequest holds multiple search queries.
type MultiSearchRequest struct {
	Searches []SearchParams `json:"searches"`
}

// MultiSearchResult represents the response from a multi-search.
type MultiSearchResult struct {
	Results []SearchResult `json:"results"`
}

// ── Index ────────────────────────────────────────────────────────────────

// FieldDefinition defines a schema field for an index.
type FieldDefinition struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Facet    *bool  `json:"facet,omitempty"`
	Optional *bool  `json:"optional,omitempty"`
	Index    *bool  `json:"index,omitempty"`
	Store    *bool  `json:"store,omitempty"`
	Sort     *bool  `json:"sort,omitempty"`
	Infix    *bool  `json:"infix,omitempty"`
	Locale   string `json:"locale,omitempty"`
}

// IndexSchema describes the schema of an index.
type IndexSchema struct {
	Fields              []FieldDefinition `json:"fields"`
	DefaultSortingField string            `json:"defaultSortingField,omitempty"`
}

// Index represents a search index.
type Index struct {
	ID              string      `json:"id"`
	Slug            string      `json:"slug"`
	DisplayName     string      `json:"displayName"`
	Version         int         `json:"version"`
	Enabled         bool        `json:"enabled"`
	OrganizationID  string      `json:"organizationId"`
	Schema          *IndexSchema `json:"schema,omitempty"`
	APIKeysCount    int         `json:"apiKeysCount,omitempty"`
	CreatedAt       string      `json:"createdAt"`
	UpdatedAt       string      `json:"updatedAt"`
}

// CreateIndexInput holds fields for creating a new index.
type CreateIndexInput struct {
	Slug               string             `json:"slug"`
	DisplayName        string             `json:"displayName"`
	Fields             []FieldDefinition  `json:"fields"`
	DefaultSortingField string            `json:"defaultSortingField,omitempty"`
}

// UpdateIndexInput holds optional fields for updating an index.
type UpdateIndexInput struct {
	DisplayName *string `json:"displayName,omitempty"`
	Enabled     *bool   `json:"enabled,omitempty"`
}

// IndexStats provides statistics about an index.
type IndexStats struct {
	ID            string `json:"id"`
	Slug          string `json:"slug"`
	DisplayName   string `json:"displayName"`
	Version       int    `json:"version"`
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

// ── Documents ────────────────────────────────────────────────────────────

// BrowseDocumentsResult holds paginated document results.
type BrowseDocumentsResult struct {
	Hits    []SearchHit `json:"hits"`
	Found   int         `json:"found"`
	Page    int         `json:"page"`
	PerPage int         `json:"perPage"`
}

// BatchResult reports the result of a batch operation.
type BatchResult struct {
	Queued   int `json:"queued"`
	Accepted int `json:"accepted"`
}

// ── API Keys ─────────────────────────────────────────────────────────────

// KeyScope represents the scope of an API key.
type KeyScope string

const (
	KeyScopeAdmin  KeyScope = "admin"
	KeyScopeIngest KeyScope = "ingest"
	KeyScopeSearch KeyScope = "search"
)

// CreateKeyInput holds fields for creating an API key.
type CreateKeyInput struct {
	IndexSlug          string     `json:"indexSlug"`
	Name               string     `json:"name"`
	Scopes             []KeyScope `json:"scopes"`
	AllowedOrigins     []string   `json:"allowedOrigins,omitempty"`
	RateLimitPerMinute *int       `json:"rateLimitPerMinute,omitempty"`
	ExpiresAt          string     `json:"expiresAt,omitempty"`
}

// APIKey represents an API key record.
type APIKey struct {
	ID                string     `json:"id"`
	Name              string     `json:"name"`
	Prefix            string     `json:"prefix"`
	Scopes            []KeyScope `json:"scopes"`
	AllowedOrigins    []string   `json:"allowedOrigins"`
	RateLimitPerMinute *int      `json:"rateLimitPerMinute"`
	ExpiresAt         *string    `json:"expiresAt"`
	RevokedAt         *string    `json:"revokedAt"`
	LastUsedAt        *string    `json:"lastUsedAt"`
	CreatedAt         string     `json:"createdAt"`
	IndexSlug         string     `json:"indexSlug,omitempty"`
	IndexDisplayName  string     `json:"indexDisplayName,omitempty"`
}

// CreateKeyResult is returned after creating an API key (includes raw key).
type CreateKeyResult struct {
	APIKey
	RawKey string `json:"rawKey"`
}

// ── Project ──────────────────────────────────────────────────────────────

// Project represents an organization/project.
type Project struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Slug         string `json:"slug"`
	Logo         *string `json:"logo"`
	MembersCount int    `json:"membersCount"`
	CreatedAt    string `json:"createdAt"`
}

// CreateProjectInput holds fields for creating a project.
type CreateProjectInput struct {
	Name string  `json:"name"`
	Slug string  `json:"slug"`
	Logo *string `json:"logo,omitempty"`
}

// ── Analytics ────────────────────────────────────────────────────────────

// AnalyticsResult holds aggregated search analytics.
type AnalyticsResult struct {
	TotalSearches     int    `json:"totalSearches"`
	TotalSessions     int    `json:"totalSessions"`
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

// UsageRow represents a single usage data row.
type UsageRow struct {
	Type       string `json:"type"`
	TotalCount int    `json:"totalCount"`
	Since      string `json:"since"`
}

// UsageResult holds usage data for a project.
type UsageResult struct {
	Since string     `json:"since"`
	Rows  []UsageRow `json:"rows"`
}

// ── Synonyms ─────────────────────────────────────────────────────────────

// Synonym represents a synonym rule.
type Synonym struct {
	ID           string   `json:"id"`
	Root         string   `json:"root"`
	Replacements []string `json:"replacements"`
	Locale       string   `json:"locale,omitempty"`
}

// CreateSynonymInput holds fields for creating a synonym.
type CreateSynonymInput struct {
	Root         string   `json:"root"`
	Replacements []string `json:"replacements"`
	Locale       string   `json:"locale,omitempty"`
}

// ── Curations ────────────────────────────────────────────────────────────

// Curation represents a search curation (pinning/hiding/boosting results).
type Curation struct {
	ID         string   `json:"id"`
	Query      string   `json:"query"`
	PinnedIDs  []string `json:"pinnedIds"`
	HiddenIDs  []string `json:"hiddenIds"`
	BoostedIDs []string `json:"boostedIds"`
}

// CreateCurationInput holds fields for creating a curation.
type CreateCurationInput struct {
	Query      string   `json:"query"`
	PinnedIDs  []string `json:"pinnedIds,omitempty"`
	HiddenIDs  []string `json:"hiddenIds,omitempty"`
	BoostedIDs []string `json:"boostedIds,omitempty"`
}

// ── Sorting ──────────────────────────────────────────────────────────────

// SortingField describes a sort configuration for an index.
type SortingField struct {
	Name      string `json:"name"`
	Field     string `json:"field"`
	Direction string `json:"direction"`
}

// CreateSortingFieldInput holds fields for creating a sorting field.
type CreateSortingFieldInput struct {
	Name      string `json:"name"`
	Field     string `json:"field"`
	Direction string `json:"direction"`
}

// ── Facets ───────────────────────────────────────────────────────────────

// FacetField describes a facet configuration for an index.
type FacetField struct {
	Name string `json:"name"`
	Type string `json:"type"`
}
