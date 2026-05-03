package aacsearch

import (
	"net/http"
	"strings"
)

// V2SearchClient is a v2 search client that uses the common HTTP transport.
// Use with search-scope keys (ss_search_*) only.
type V2SearchClient struct {
	baseURL string
	apiKey  string
	client  *http.Client
}

// NewV2SearchClient creates a new V2SearchClient.
func NewV2SearchClient(baseURL, apiKey string, opts ...V2ClientOption) (*V2SearchClient, error) {
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
	return &V2SearchClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		client:  hc,
	}, nil
}

// V2ClientOption allows setting custom HTTP client on a v2 client.
type V2ClientOption func(c *http.Client)

// V2WithHTTPClient sets a custom HTTP client.
func V2WithHTTPClient(hc *http.Client) V2ClientOption {
	return func(c *http.Client) {
		*c = *hc
	}
}

// Search executes a search query against the specified index by slug or ID.
func (c *V2SearchClient) Search(indexSlug string, params *SearchParams) (*V2SearchResult, error) {
	path := "/api/v2/indexes/" + urlEncode(indexSlug) + "/search"
	var result V2SearchResult
	if err := doRequest(c.client, c.baseURL, c.apiKey, "POST", path, params, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// MultiSearch executes multiple search queries across indexes in a single request (v2).
func (c *V2SearchClient) MultiSearch(searches []V2MultiSearchItem) (*V2MultiSearchResult, error) {
	var result V2MultiSearchResult
	if err := doRequest(c.client, c.baseURL, c.apiKey, "POST", "/api/v2/multi-search", searches, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// TrackEvent sends an analytics event to the tracking endpoint.
func (c *V2SearchClient) TrackEvent(input TrackEventInput) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := doRequest(c.client, c.baseURL, c.apiKey, "POST", "/api/analytics/events/track", input, &result); err != nil {
		return nil, err
	}
	return result, nil
}
