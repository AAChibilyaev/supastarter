// Package aacsearch provides a Go client for the AACSearch v1 REST API.
//
// Two clients are available:
//   - SearchClient: browser-safe public search client (search-scoped keys)
//   - AdminClient: server-side management client (admin-scoped keys)
//
// Usage (SearchClient):
//
//	client, err := aacsearch.NewSearchClient(aacsearch.SearchClientOptions{
//	    BaseURL:   "https://app.aacsearch.com",
//	    APIKey:    "ss_search_...",
//	    IndexSlug: "products",
//	})
//	if err != nil {
//	    log.Fatal(err)
//	}
//	result, err := client.Search(aacsearch.SearchParams{Q: "laptop"})
//
// Usage (AdminClient):
//
//	admin, err := aacsearch.NewAdminClient(aacsearch.AdminClientOptions{
//	    BaseURL:   "https://app.aacsearch.com",
//	    APIKey:    "aa_admin_...",
//	    ProjectID: "org_xxx",
//	})
//	indexes, err := admin.ListIndexes()
package aacsearch

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	defaultTimeout = 30 * time.Second
	userAgent      = "aacsearch-go-sdk/0.1.0"
)

// ClientOptions holds shared options for both SearchClient and AdminClient.
type ClientOptions struct {
	BaseURL   string
	APIKey    string
	HTTPClient *http.Client
}

// SearchClientOptions extends ClientOptions with search-specific fields.
type SearchClientOptions struct {
	ClientOptions
	IndexSlug string
}

// AdminClientOptions extends ClientOptions with admin-specific fields.
type AdminClientOptions struct {
	ClientOptions
	ProjectID string
}

// SearchClient is a browser-safe public search client.
// Use with search-scope keys (ss_search_*) only.
type SearchClient struct {
	baseURL   string
	apiKey    string
	indexSlug string
	client    *http.Client
}

// AdminClient is a server-side management client.
// Use with admin-scope keys (aa_admin_*) only; never bundle in browser code.
type AdminClient struct {
	baseURL   string
	apiKey    string
	projectID string
	client    *http.Client
}

// NewSearchClient creates a new SearchClient.
func NewSearchClient(opts SearchClientOptions) (*SearchClient, error) {
	if opts.BaseURL == "" {
		return nil, fmt.Errorf("aacsearch: BaseURL is required")
	}
	if opts.APIKey == "" {
		return nil, fmt.Errorf("aacsearch: APIKey is required")
	}
	if opts.IndexSlug == "" {
		return nil, fmt.Errorf("aacsearch: IndexSlug is required")
	}
	hc := opts.HTTPClient
	if hc == nil {
		hc = &http.Client{Timeout: defaultTimeout}
	}
	return &SearchClient{
		baseURL:   strings.TrimRight(opts.BaseURL, "/"),
		apiKey:    opts.APIKey,
		indexSlug: opts.IndexSlug,
		client:    hc,
	}, nil
}

// NewAdminClient creates a new AdminClient.
func NewAdminClient(opts AdminClientOptions) (*AdminClient, error) {
	if opts.BaseURL == "" {
		return nil, fmt.Errorf("aacsearch: BaseURL is required")
	}
	if opts.APIKey == "" {
		return nil, fmt.Errorf("aacsearch: APIKey is required")
	}
	if opts.ProjectID == "" {
		return nil, fmt.Errorf("aacsearch: ProjectID is required")
	}
	hc := opts.HTTPClient
	if hc == nil {
		hc = &http.Client{Timeout: defaultTimeout}
	}
	return &AdminClient{
		baseURL:   strings.TrimRight(opts.BaseURL, "/"),
		apiKey:    opts.APIKey,
		projectID: opts.ProjectID,
		client:    hc,
	}, nil
}

// ── HTTP transport ───────────────────────────────────────────────────────

func (c *SearchClient) request(method, path string, body, result interface{}) error {
	return doRequest(c.client, c.baseURL, c.apiKey, method, path, body, result)
}

func (c *AdminClient) request(method, path string, body, result interface{}) error {
	return doRequest(c.client, c.baseURL, c.apiKey, method, path, body, result)
}

func doRequest(hc *http.Client, baseURL, apiKey, method, path string, body, result interface{}) error {
	u := baseURL + path

	var reqBody []byte
	if body != nil {
		var err error
		reqBody, err = json.Marshal(body)
		if err != nil {
			return &SDKError{Code: "invalid_input", Message: fmt.Sprintf("failed to marshal request body: %v", err)}
		}
	}

	req, err := http.NewRequest(method, u, bytes.NewReader(reqBody))
	if err != nil {
		return &SDKError{Code: "network_error", Message: fmt.Sprintf("failed to create request: %v", err)}
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", userAgent)

	resp, err := hc.Do(req)
	if err != nil {
		return &SDKError{Code: "network_error", Message: fmt.Sprintf("request failed: %v", err)}
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return &SDKError{Code: "network_error", Message: fmt.Sprintf("failed to read response: %v", err)}
	}

	if resp.StatusCode >= 400 {
		var errResp struct {
			Error   string      `json:"error"`
			Details interface{} `json:"details,omitempty"`
		}
		if json.Unmarshal(respBody, &errResp) == nil && errResp.Error != "" {
			return &SDKError{
				Code:    errResp.Error,
				Status:  resp.StatusCode,
				Message: fmt.Sprintf("%d %s", resp.StatusCode, errResp.Error),
				Details: errResp.Details,
			}
		}
		return &SDKError{
			Code:    "unexpected",
			Status:  resp.StatusCode,
			Message: fmt.Sprintf("%d %s", resp.StatusCode, http.StatusText(resp.StatusCode)),
		}
	}

	if result != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, result); err != nil {
			return &SDKError{Code: "internal_error", Message: fmt.Sprintf("failed to decode response: %v", err)}
		}
	}

	return nil
}

// urlEncode safely encodes a path segment.
func urlEncode(s string) string {
	return url.PathEscape(s)
}
