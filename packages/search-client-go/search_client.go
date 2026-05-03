package aacsearch

// SearchClient methods: browser-safe public search operations.

// Search executes a search query against the configured index.
func (c *SearchClient) Search(params SearchParams) (*SearchResult, error) {
	path := "/api/v1/indexes/" + urlEncode(c.indexSlug) + "/search"
	var result SearchResult
	if err := c.request("POST", path, params, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// MultiSearch executes multiple search queries in a single request.
func (c *SearchClient) MultiSearch(searches []SearchParams) (*MultiSearchResult, error) {
	body := MultiSearchRequest{Searches: searches}
	var result MultiSearchResult
	if err := c.request("POST", "/api/v1/multi-search", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}
