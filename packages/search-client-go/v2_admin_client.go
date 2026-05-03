package aacsearch

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// V2AdminClient is a v2 admin client that uses the common HTTP transport.
// Use with admin-scope keys (aa_admin_*) only; never bundle in browser code.
type V2AdminClient struct {
	baseURL string
	apiKey  string
	client  *http.Client
}

// NewV2AdminClient creates a new V2AdminClient.
func NewV2AdminClient(baseURL, apiKey string, opts ...V2ClientOption) (*V2AdminClient, error) {
	if baseURL == "" {
		return nil, &SDKError{Code: "invalid_input", Message: "aacsearch: BaseURL is required"}
	}
	if apiKey == "" {
		return nil, &SDKError{Code: "invalid_input", Message: "aacsearch: APIKey is required"}
	}
	hc := &http.Client{Timeout: defaultTimeout}
	for _, opt := range opts {
		opt(hc)
	}
	return &V2AdminClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		client:  hc,
	}, nil
}

// ── Project operations ───────────────────────────────────────────────────

// GetProject returns the current project (organization) details (v2).
func (c *V2AdminClient) GetProject() (*V2Project, error) {
	var result V2Project
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", "/api/v2/projects", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// CreateProject creates a new project (organization) (v2).
func (c *V2AdminClient) CreateProject(input V2CreateProjectInput) (*V2Project, error) {
	var result V2Project
	if err := doRequest(c.client, c.baseURL, c.apiKey, "POST", "/api/v2/projects", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetProjectByID returns a project by its ID (v2).
func (c *V2AdminClient) GetProjectByID(projectID string) (*V2Project, error) {
	var result V2Project
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", "/api/v2/projects/"+urlEncode(projectID), nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ── Index operations ─────────────────────────────────────────────────────

// ListIndexes returns all indexes in the specified project (v2).
func (c *V2AdminClient) ListIndexes(projectID string) ([]V2SearchIndex, error) {
	var result []V2SearchIndex
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", "/api/v2/projects/"+urlEncode(projectID)+"/indexes", nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// CreateIndex creates a new search index (v2).
func (c *V2AdminClient) CreateIndex(projectID string, input V2CreateIndexInput) (*V2SearchIndex, error) {
	var result V2SearchIndex
	if err := doRequest(c.client, c.baseURL, c.apiKey, "POST", "/api/v2/projects/"+urlEncode(projectID)+"/indexes", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetIndex returns a single index by its ID (v2).
func (c *V2AdminClient) GetIndex(indexID string) (*V2SearchIndex, error) {
	var result V2SearchIndex
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", "/api/v2/indexes/"+urlEncode(indexID), nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// UpdateIndex updates index metadata (v2).
func (c *V2AdminClient) UpdateIndex(indexID string, input V2UpdateIndexInput) (*V2SearchIndex, error) {
	var result V2SearchIndex
	if err := doRequest(c.client, c.baseURL, c.apiKey, "PATCH", "/api/v2/indexes/"+urlEncode(indexID), input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// DeleteIndex deletes an index and its Typesense collections (v2).
func (c *V2AdminClient) DeleteIndex(indexID string) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := doRequest(c.client, c.baseURL, c.apiKey, "DELETE", "/api/v2/indexes/"+urlEncode(indexID), nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// GetIndexStats returns statistics about an index (v2).
func (c *V2AdminClient) GetIndexStats(indexID string) (*V2IndexStats, error) {
	var result V2IndexStats
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", "/api/v2/indexes/"+urlEncode(indexID)+"/stats", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ── Document operations (v2, cursor-based pagination) ────────────────────

// ListDocuments browses documents in an index using cursor-based pagination (v2).
func (c *V2AdminClient) ListDocuments(indexID string, opts *V2ListDocumentsParams) (*V2BrowseDocumentsResult, error) {
	path := "/api/v2/indexes/" + urlEncode(indexID) + "/documents"
	if opts != nil {
		vals := map[string]string{}
		if opts.Cursor != "" {
			vals["cursor"] = opts.Cursor
		}
		if opts.PerPage > 0 {
			vals["perPage"] = fmt.Sprintf("%d", opts.PerPage)
		}
		if opts.FilterBy != "" {
			vals["filterBy"] = opts.FilterBy
		}
		if len(vals) > 0 {
			path += "?" + v2EncodeQuery(vals)
		}
	}
	var result V2BrowseDocumentsResult
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", path, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// UpsertDocuments upserts multiple documents into an index (v2).
// The action parameter is optional and defaults to "upsert".
func (c *V2AdminClient) UpsertDocuments(indexID string, docs []map[string]interface{}, action ...DocumentAction) (*V2BatchResult, error) {
	input := V2UpsertDocumentsInput{Documents: docs}
	if len(action) > 0 && action[0] != "" {
		input.Action = action[0]
	}
	var result V2BatchResult
	if err := doRequest(c.client, c.baseURL, c.apiKey, "POST", "/api/v2/indexes/"+urlEncode(indexID)+"/documents", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetDocument returns a single document by its ID (v2).
func (c *V2AdminClient) GetDocument(indexID, docID string) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", "/api/v2/indexes/"+urlEncode(indexID)+"/documents/"+urlEncode(docID), nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// UpsertDocument creates or updates a single document (v2).
func (c *V2AdminClient) UpsertDocument(indexID, docID string, data map[string]interface{}) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := doRequest(c.client, c.baseURL, c.apiKey, "PUT", "/api/v2/indexes/"+urlEncode(indexID)+"/documents/"+urlEncode(docID), data, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// DeleteDocument deletes a single document by its ID (v2).
func (c *V2AdminClient) DeleteDocument(indexID, docID string) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := doRequest(c.client, c.baseURL, c.apiKey, "DELETE", "/api/v2/indexes/"+urlEncode(indexID)+"/documents/"+urlEncode(docID), nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// BatchDeleteDocuments deletes multiple documents by their IDs (v2).
func (c *V2AdminClient) BatchDeleteDocuments(indexID string, ids []string) (*V2BatchResult, error) {
	body := V2BatchDeleteBody{IDs: ids}
	var result V2BatchResult
	if err := doRequest(c.client, c.baseURL, c.apiKey, "POST", "/api/v2/indexes/"+urlEncode(indexID)+"/documents:batchDelete", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ExportDocuments exports documents from an index (v2).
// format defaults to "jsonl" if empty.
func (c *V2AdminClient) ExportDocuments(indexID string, format ...ExportFormat) ([]map[string]interface{}, error) {
	path := "/api/v2/indexes/" + urlEncode(indexID) + "/documents:export"
	if len(format) > 0 && format[0] != "" {
		path += "?format=" + string(format[0])
	}
	var result []map[string]interface{}
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", path, nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// ── API Key operations ───────────────────────────────────────────────────

// ListKeys returns all API keys in the project (v2).
func (c *V2AdminClient) ListKeys(projectID string) ([]V2APIKey, error) {
	var result []V2APIKey
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", "/api/v2/projects/"+urlEncode(projectID)+"/keys", nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// CreateKey creates a new API key for the project (v2).
func (c *V2AdminClient) CreateKey(projectID string, input V2CreateKeyInput) (*V2CreateKeyResult, error) {
	var result V2CreateKeyResult
	if err := doRequest(c.client, c.baseURL, c.apiKey, "POST", "/api/v2/projects/"+urlEncode(projectID)+"/keys", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// RevokeKey revokes an API key by its ID (v2).
func (c *V2AdminClient) RevokeKey(keyID string) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := doRequest(c.client, c.baseURL, c.apiKey, "DELETE", "/api/v2/keys/"+urlEncode(keyID), nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// ── Synonym operations (v2) ──────────────────────────────────────────────

// ListSynonyms returns all synonyms for an index (v2).
func (c *V2AdminClient) ListSynonyms(indexID string) ([]V2Synonym, error) {
	var result []V2Synonym
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", "/api/v2/indexes/"+urlEncode(indexID)+"/synonyms", nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// CreateSynonym creates a synonym for an index (v2).
func (c *V2AdminClient) CreateSynonym(indexID string, input V2CreateSynonymInput) (*V2Synonym, error) {
	var result V2Synonym
	if err := doRequest(c.client, c.baseURL, c.apiKey, "POST", "/api/v2/indexes/"+urlEncode(indexID)+"/synonyms", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// UpsertSynonyms replaces all synonyms for an index (v2).
func (c *V2AdminClient) UpsertSynonyms(indexID string, synonyms []V2CreateSynonymInput) ([]V2Synonym, error) {
	var result []V2Synonym
	if err := doRequest(c.client, c.baseURL, c.apiKey, "PUT", "/api/v2/indexes/"+urlEncode(indexID)+"/synonyms", synonyms, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// DeleteSynonym deletes a synonym by its ID (v2).
func (c *V2AdminClient) DeleteSynonym(indexID, synonymID string) (map[string]interface{}, error) {
	path := "/api/v2/indexes/" + urlEncode(indexID) + "/synonyms?synonymId=" + url.QueryEscape(synonymID)
	var result map[string]interface{}
	if err := doRequest(c.client, c.baseURL, c.apiKey, "DELETE", path, nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// ── Curation operations (v2) ─────────────────────────────────────────────

// ListCurations returns all curations for an index (v2).
func (c *V2AdminClient) ListCurations(indexID string) ([]V2Curation, error) {
	var result []V2Curation
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", "/api/v2/indexes/"+urlEncode(indexID)+"/curations", nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// CreateCuration creates a curation for an index (v2).
func (c *V2AdminClient) CreateCuration(indexID string, input V2CreateCurationInput) (*V2Curation, error) {
	var result V2Curation
	if err := doRequest(c.client, c.baseURL, c.apiKey, "POST", "/api/v2/indexes/"+urlEncode(indexID)+"/curations", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// UpsertCurations replaces all curations for an index (v2).
func (c *V2AdminClient) UpsertCurations(indexID string, curations []V2CreateCurationInput) ([]V2Curation, error) {
	var result []V2Curation
	if err := doRequest(c.client, c.baseURL, c.apiKey, "PUT", "/api/v2/indexes/"+urlEncode(indexID)+"/curations", curations, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// ── Analytics ────────────────────────────────────────────────────────────

// GetAnalytics returns aggregated search analytics for the project (v2).
func (c *V2AdminClient) GetAnalytics(projectID string) (*V2AnalyticsResult, error) {
	var result V2AnalyticsResult
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", "/api/v2/projects/"+urlEncode(projectID)+"/analytics", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ── Usage ────────────────────────────────────────────────────────────────

// GetUsage returns usage data for the project (v2).
func (c *V2AdminClient) GetUsage(projectID string) (*V2UsageResult, error) {
	var result V2UsageResult
	if err := doRequest(c.client, c.baseURL, c.apiKey, "GET", "/api/v2/projects/"+urlEncode(projectID)+"/usage", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ── Helper ───────────────────────────────────────────────────────────────

func v2EncodeQuery(vals map[string]string) string {
	if len(vals) == 0 {
		return ""
	}
	var parts []string
	for k, v := range vals {
		parts = append(parts, k+"="+url.PathEscape(v))
	}
	return strings.Join(parts, "&")
}
