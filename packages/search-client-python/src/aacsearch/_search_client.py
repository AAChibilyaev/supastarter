"""
Browser-safe public search client for AACSearch.

Only works with `ss_search_*` (search-only) or `ss_scoped_*` tokens.
Never bundle admin/write keys in browser code.
"""

from __future__ import annotations

from typing import Any

from ._transport import _request


class SearchClient:
    """Client for the AACSearch public search API.

    Args:
        base_url: Origin of the AACSearch deployment (e.g. ``https://app.aacsearch.com``).
        api_key: A search-scope key (``ss_search_…``) or scoped token (``ss_scoped_…``).
        index_slug: Public index slug to search against.
        timeout: HTTP request timeout in seconds.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        index_slug: str,
        timeout: float = 30.0,
    ) -> None:
        if not base_url:
            raise ValueError("SearchClient: base_url is required")
        if not api_key:
            raise ValueError("SearchClient: api_key is required")
        if not index_slug:
            raise ValueError("SearchClient: index_slug is required")

        self._base_url = base_url
        self._api_key = api_key
        self._index_slug = index_slug
        self._timeout = timeout

    def search(
        self,
        q: str = "*",
        *,
        query_by: str | None = None,
        filter_by: str | None = None,
        facet_by: str | None = None,
        sort_by: str | None = None,
        per_page: int | None = None,
        page: int | None = None,
        highlight_fields: str | None = None,
    ) -> dict[str, Any]:
        """Search the index with a text query and optional filters.

        Args:
            q: Search query string (default ``"*"`` for all documents).
            query_by: Comma-separated field names to search.
            filter_by: Filter expression (Typesense filter syntax).
            facet_by: Comma-separated field names to return facets for.
            sort_by: Sort expression (e.g. ``"price:desc"``).
            per_page: Results per page (max 250).
            page: Page number (1-based).
            highlight_fields: Comma-separated field names for highlighting.

        Returns:
            Raw search response from the API.
        """
        params: dict[str, Any] = {"q": q}
        if query_by is not None:
            params["queryBy"] = query_by
        if filter_by is not None:
            params["filterBy"] = filter_by
        if facet_by is not None:
            params["facetBy"] = facet_by
        if sort_by is not None:
            params["sortBy"] = sort_by
        if per_page is not None:
            params["perPage"] = per_page
        if page is not None:
            params["page"] = page
        if highlight_fields is not None:
            params["highlightFields"] = highlight_fields

        return _request(
            self._base_url,
            self._api_key,
            "POST",
            f"/api/v1/indexes/{self._index_slug}/search",
            body=params,
            timeout=self._timeout,
        )

    def multi_search(
        self,
        searches: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Execute multiple search queries in a single request.

        Args:
            searches: List of search parameter dicts. Each dict supports the
                same fields as :meth:`search`.

        Returns:
            Combined search response.
        """
        return _request(
            self._base_url,
            self._api_key,
            "POST",
            "/api/v1/multi-search",
            body={"searches": searches},
            timeout=self._timeout,
        )
