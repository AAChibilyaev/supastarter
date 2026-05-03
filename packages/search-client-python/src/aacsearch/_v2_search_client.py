"""
Browser-safe public search client for the AACSearch v2 REST API.

Only works with ``ss_search_*`` (search-only) or ``ss_scoped_*`` tokens.
Never bundle admin/write keys in browser code.
"""

from __future__ import annotations

from typing import Any

from ._transport import _request


class V2SearchClient:
    """Client for the AACSearch v2 public search API.

    Args:
        base_url: Origin of the AACSearch deployment (e.g. ``https://app.aacsearch.com``).
        api_key: A search-scope key (``ss_search_...``) or scoped token (``ss_scoped_...``).
        timeout: HTTP request timeout in seconds.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: float = 30.0,
    ) -> None:
        if not base_url:
            raise ValueError("V2SearchClient: base_url is required")
        if not api_key:
            raise ValueError("V2SearchClient: api_key is required")

        self._base_url = base_url
        self._api_key = api_key
        self._timeout = timeout

    def search(
        self,
        index_slug: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Search an index with full query parameters.

        Args:
            index_slug: The index slug or ID to search against.
            params: Search parameters (q, queryBy, filterBy, facetBy, sortBy,
                perPage, page, highlightFields, includeFields, excludeFields,
                numTypos, prefix, exact, prioritizeExactMatch, etc.).

        Returns:
            Raw search response from the v2 API.
        """
        return _request(
            self._base_url,
            self._api_key,
            "POST",
            f"/api/v2/indexes/{_e(index_slug)}/search",
            body=params or {"q": "*"},
            timeout=self._timeout,
        )

    def multi_search(
        self,
        searches: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Execute multiple search queries across indexes in a single request.

        Args:
            searches: List of search spec dicts. Each must contain ``indexId``
                (slug or ID) and ``search`` (the search params dict, same shape
                as the ``params`` argument of :meth:`search`).

        Returns:
            Combined search response from the v2 API.
        """
        return _request(
            self._base_url,
            self._api_key,
            "POST",
            "/api/v2/multi-search",
            body=searches,
            timeout=self._timeout,
        )

    def track_event(
        self,
        input: dict[str, Any],
    ) -> dict[str, Any]:
        """Track an analytics event.

        Args:
            input: Event payload (e.g. ``{"event": "search", "indexId": "...",
                "query": "laptop", "hits": 42}``).

        Returns:
            API response confirming the event was tracked.
        """
        return _request(
            self._base_url,
            self._api_key,
            "POST",
            "/api/analytics/events/track",
            body=input,
            timeout=self._timeout,
        )


def _e(value: str) -> str:
    """URL-encode a path segment."""
    from urllib.parse import quote

    return quote(value, safe="")
