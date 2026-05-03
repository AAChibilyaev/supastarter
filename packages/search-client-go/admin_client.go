package aacsearch

import (
	"fmt"
	"net/url"
	"strings"
)

// ── Project operations ─────────────────────────────────────────────

// GetProject returns the current project (organization) details.
func (c *AdminClient) GetProject() (*Project, error) {
	var result Project
	if err := c.request("GET", "/api/v1/projects", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// CreateProject creates a new project (organization).
func (c *AdminClient) CreateProject(input CreateProjectInput) (*Project, error) {
	var result Project
	if err := c.request("POST", "/api/v1/projects", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetProjectByID returns a project by its ID.
func (c *AdminClient) GetProjectByID(id string) (*Project, error) {
	var result Project
	if err := c.request("GET", "/api/v1/projects/"+urlEncode(id), nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ── Index operations ───────────────────────────────────────────────

// ListIndexes returns all indexes in the project.
func (c *AdminClient) ListIndexes() ([]Index, error) {
	var result []Index
	if err := c.request("GET", "/api/v1/projects/"+urlEncode(c.projectID)+"/indexes", nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// GetIndex returns a single index by its ID.
func (c *AdminClient) GetIndex(indexID string) (*Index, error) {
	var result Index
	if err := c.request("GET", "/api/v1/indexes/"+urlEncode(indexID), nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// CreateIndex creates a new search index with schema and Typesense collection.
func (c *AdminClient) CreateIndex(input CreateIndexInput) (*Index, error) {
	var result Index
	if err := c.request("POST", "/api/v1/projects/"+urlEncode(c.projectID)+"/indexes", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// UpdateIndex updates the display name and/or enabled status of an index.
func (c *AdminClient) UpdateIndex(indexID string, input UpdateIndexInput) (*Index, error) {
	var result Index
	if err := c.request("PATCH", "/api/v1/indexes/"+urlEncode(indexID), input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// DeleteIndex deletes an index and its Typesense collections.
func (c *AdminClient) DeleteIndex(indexID string) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := c.request("DELETE", "/api/v1/indexes/"+urlEncode(indexID), nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// GetIndexStats returns statistics about an index.
func (c *AdminClient) GetIndexStats(indexID string) (*IndexStats, error) {
	var result IndexStats
	if err := c.request("GET", "/api/v1/indexes/"+urlEncode(indexID)+"/stats", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ── Document operations ────────────────────────────────────────────

// ListDocumentsParams holds optional query parameters for listing documents.
type ListDocumentsParams struct {
	Q        string
	Page     int
	PerPage  int
	FilterBy string
}

// ListDocuments browses documents in an index.
func (c *AdminClient) ListDocuments(indexID string, query *ListDocumentsParams) (*BrowseDocumentsResult, error) {
	path := "/api/v1/indexes/" + urlEncode(indexID) + "/documents"
	if query != nil {
		vals := map[string]string{}
		if query.Q != "" {
			vals["q"] = query.Q
		}
		if query.Page > 0 {
			vals["page"] = fmt.Sprintf("%d", query.Page)
		}
		if query.PerPage > 0 {
			vals["perPage"] = fmt.Sprintf("%d", query.PerPage)
		}
		if query.FilterBy != "" {
			vals["filterBy"] = query.FilterBy
		}
		if len(vals) > 0 {
			path += "?" + encodeQuery(vals)
		}
	}
	var result BrowseDocumentsResult
	if err := c.request("GET", path, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// UpsertDocument creates or updates a single document.
func (c *AdminClient) UpsertDocument(indexID, documentID string, document map[string]interface{}) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := c.request("PUT", "/api/v1/indexes/"+urlEncode(indexID)+"/documents/"+urlEncode(documentID), document, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// BatchUpsertDocuments upserts multiple documents (up to 5000).
type batchUpsertBody struct {
	Documents []map[string]interface{} `json:"documents"`
}

// BatchUpsertDocuments upserts multiple documents in a batch.
func (c *AdminClient) BatchUpsertDocuments(indexID string, documents []map[string]interface{}) (*BatchResult, error) {
	body := batchUpsertBody{Documents: documents}
	var result BatchResult
	if err := c.request("POST", "/api/v1/indexes/"+urlEncode(indexID)+"/documents:batch", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// BatchDeleteDocuments deletes multiple documents by IDs.
type batchDeleteBody struct {
	IDs []string `json:"ids"`
}

// BatchDeleteDocuments deletes documents by their IDs.
func (c *AdminClient) BatchDeleteDocuments(indexID string, ids []string) (*BatchResult, error) {
	body := batchDeleteBody{IDs: ids}
	var result BatchResult
	if err := c.request("POST", "/api/v1/indexes/"+urlEncode(indexID)+"/documents:batchDelete", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// DeleteDocument deletes a single document by its ID.
func (c *AdminClient) DeleteDocument(indexID, documentID string) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := c.request("DELETE", "/api/v1/indexes/"+urlEncode(indexID)+"/documents/"+urlEncode(documentID), nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// ── Search ─────────────────────────────────────────────────────────

// Search searches an index (requires a key with search scope).
func (c *AdminClient) Search(indexID string, params SearchParams) (*SearchResult, error) {
	var result SearchResult
	if err := c.request("POST", "/api/v1/indexes/"+urlEncode(indexID)+"/search", params, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ── API Key operations ─────────────────────────────────────────────

// ListKeys returns all API keys in the project.
func (c *AdminClient) ListKeys() ([]APIKey, error) {
	var result []APIKey
	if err := c.request("GET", "/api/v1/projects/"+urlEncode(c.projectID)+"/keys", nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// CreateKey creates a new API key for the project.
func (c *AdminClient) CreateKey(input CreateKeyInput) (*CreateKeyResult, error) {
	var result CreateKeyResult
	if err := c.request("POST", "/api/v1/projects/"+urlEncode(c.projectID)+"/keys", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// RevokeKey revokes an API key by its ID.
func (c *AdminClient) RevokeKey(keyID string) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := c.request("DELETE", "/api/v1/keys/"+urlEncode(keyID), nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// ── Analytics ──────────────────────────────────────────────────────

// GetAnalytics returns aggregated search analytics for the project.
func (c *AdminClient) GetAnalytics(period string) (*AnalyticsResult, error) {
	path := "/api/v1/projects/" + urlEncode(c.projectID) + "/analytics"
	if period != "" {
		path += "?period=" + period
	}
	var result AnalyticsResult
	if err := c.request("GET", path, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetUsage returns raw usage data for the project.
func (c *AdminClient) GetUsage(windowDays int) (*UsageResult, error) {
	path := "/api/v1/projects/" + urlEncode(c.projectID) + "/usage"
	if windowDays > 0 {
		path += fmt.Sprintf("?windowDays=%d", windowDays)
	}
	var result UsageResult
	if err := c.request("GET", path, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ── Synonym operations ─────────────────────────────────────────────

// ListSynonyms returns all synonyms for an index.
func (c *AdminClient) ListSynonyms(indexID string) ([]Synonym, error) {
	var result []Synonym
	if err := c.request("GET", "/api/v1/indexes/"+urlEncode(indexID)+"/synonyms", nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// CreateSynonym creates a synonym for an index.
func (c *AdminClient) CreateSynonym(indexID string, input CreateSynonymInput) (*Synonym, error) {
	var result Synonym
	if err := c.request("POST", "/api/v1/indexes/"+urlEncode(indexID)+"/synonyms", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// UpsertSynonyms replaces all synonyms for an index.
func (c *AdminClient) UpsertSynonyms(indexID string, synonyms []CreateSynonymInput) ([]Synonym, error) {
	var result []Synonym
	if err := c.request("PUT", "/api/v1/indexes/"+urlEncode(indexID)+"/synonyms", synonyms, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// DeleteSynonym deletes a synonym by its ID.
func (c *AdminClient) DeleteSynonym(indexID, synonymID string) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := c.request("DELETE", "/api/v1/indexes/"+urlEncode(indexID)+"/synonyms/"+urlEncode(synonymID), nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// ── Curation operations ───────────────────────────────────────────

// ListCurations returns all curations for an index.
func (c *AdminClient) ListCurations(indexID string) ([]Curation, error) {
	var result []Curation
	if err := c.request("GET", "/api/v1/indexes/"+urlEncode(indexID)+"/curations", nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// CreateCuration creates a curation for an index.
func (c *AdminClient) CreateCuration(indexID string, input CreateCurationInput) (*Curation, error) {
	var result Curation
	if err := c.request("POST", "/api/v1/indexes/"+urlEncode(indexID)+"/curations", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// UpsertCurations replaces all curations for an index.
func (c *AdminClient) UpsertCurations(indexID string, curations []CreateCurationInput) ([]Curation, error) {
	var result []Curation
	if err := c.request("PUT", "/api/v1/indexes/"+urlEncode(indexID)+"/curations", curations, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// DeleteCuration deletes a curation by its ID.
func (c *AdminClient) DeleteCuration(indexID, curationID string) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := c.request("DELETE", "/api/v1/indexes/"+urlEncode(indexID)+"/curations/"+urlEncode(curationID), nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// ── Sorting field operations ───────────────────────────────────────

// ListSortingFields returns all sorting fields for an index.
func (c *AdminClient) ListSortingFields(indexID string) ([]SortingField, error) {
	var result []SortingField
	if err := c.request("GET", "/api/v1/indexes/"+urlEncode(indexID)+"/sorting", nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// CreateSortingField adds a sorting field to an index.
func (c *AdminClient) CreateSortingField(indexID string, input CreateSortingFieldInput) (*SortingField, error) {
	var result SortingField
	if err := c.request("POST", "/api/v1/indexes/"+urlEncode(indexID)+"/sorting", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ReplaceSortingFields replaces all sorting fields for an index.
func (c *AdminClient) ReplaceSortingFields(indexID string, fields []CreateSortingFieldInput) ([]SortingField, error) {
	var result []SortingField
	if err := c.request("PUT", "/api/v1/indexes/"+urlEncode(indexID)+"/sorting", fields, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// DeleteSortingField removes a sorting field from an index.
func (c *AdminClient) DeleteSortingField(indexID, fieldName string) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := c.request("DELETE", "/api/v1/indexes/"+urlEncode(indexID)+"/sorting/"+urlEncode(fieldName), nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// ── Facet operations ───────────────────────────────────────────────

// ListFacetsResult wraps the facets response.
type ListFacetsResult struct {
	Fields []FacetField `json:"fields"`
}

// ListFacets returns all facet fields for an index.
func (c *AdminClient) ListFacets(indexID string) (*ListFacetsResult, error) {
	var result ListFacetsResult
	if err := c.request("GET", "/api/v1/indexes/"+urlEncode(indexID)+"/facets", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ── Helpers ────────────────────────────────────────────────────────

func encodeQuery(vals map[string]string) string {
	if len(vals) == 0 {
		return ""
	}
	var parts []string
	for k, v := range vals {
		parts = append(parts, k+"="+url.PathEscape(v))
	}
	return strings.Join(parts, "&")
}
