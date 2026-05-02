"""
Server-side administration client for the AACSearch v1 REST API.

Requires an admin-scope API key (``aa_admin_*``). Never bundle in browser code.
"""

from __future__ import annotations

from typing import Any

from ._transport import _request


class AdminClient:
    """Client for managing AACSearch projects, indexes, documents, keys, and more.

    Args:
        base_url: Origin of the AACSearch deployment (e.g. ``https://app.aacsearch.com``).
        api_key: An admin-scope API key (``aa_admin_…``).
        project_id: The project (organization) ID. Discover via ``get_project()`` if unknown.
        timeout: HTTP request timeout in seconds.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        project_id: str,
        timeout: float = 30.0,
    ) -> None:
        if not base_url:
            raise ValueError("AdminClient: base_url is required")
        if not api_key:
            raise ValueError("AdminClient: api_key is required")
        if not project_id:
            raise ValueError("AdminClient: project_id is required")

        self._base_url = base_url
        self._api_key = api_key
        self._project_id = project_id
        self._timeout = timeout

    # ── Project operations ───────────────────────────────────────────

    def get_project(self) -> dict[str, Any]:
        """Get current project details."""
        return _request(self._base_url, self._api_key, "GET", "/api/v1/projects", timeout=self._timeout)

    def create_project(self, name: str, slug: str, logo: str | None = None) -> dict[str, Any]:
        """Create a new project (organization).

        Args:
            name: Display name (max 120 chars).
            slug: URL-safe identifier (``^[a-z0-9][a-z0-9-]*$``, max 64 chars).
            logo: Optional logo URL.
        """
        body: dict[str, Any] = {"name": name, "slug": slug}
        if logo is not None:
            body["logo"] = logo
        return _request(self._base_url, self._api_key, "POST", "/api/v1/projects", body=body, timeout=self._timeout)

    def get_project_by_id(self, project_id: str) -> dict[str, Any]:
        """Get project by ID.

        Args:
            project_id: The project (organization) ID.
        """
        return _request(self._base_url, self._api_key, "GET", f"/api/v1/projects/{_e(project_id)}", timeout=self._timeout)

    # ── Index operations ─────────────────────────────────────────────

    def list_indexes(self) -> list[dict[str, Any]]:
        """List all indexes in the project."""
        return _request(self._base_url, self._api_key, "GET", f"/api/v1/projects/{_e(self._project_id)}/indexes", timeout=self._timeout)

    def get_index(self, index_id: str) -> dict[str, Any]:
        """Get a single index by its ID."""
        return _request(self._base_url, self._api_key, "GET", f"/api/v1/indexes/{_e(index_id)}", timeout=self._timeout)

    def create_index(
        self,
        slug: str,
        display_name: str,
        fields: list[dict[str, Any]],
        default_sorting_field: str | None = None,
    ) -> dict[str, Any]:
        """Create a new search index with schema and Typesense collection.

        Args:
            slug: URL-safe index identifier.
            display_name: Human-readable name.
            fields: Array of field definitions (``name``, ``type``, ``facet``, ``optional``, etc.).
            default_sorting_field: Optional default sort field name.
        """
        body: dict[str, Any] = {"slug": slug, "displayName": display_name, "fields": fields}
        if default_sorting_field is not None:
            body["defaultSortingField"] = default_sorting_field
        return _request(self._base_url, self._api_key, "POST", f"/api/v1/projects/{_e(self._project_id)}/indexes", body=body, timeout=self._timeout)

    def update_index(self, index_id: str, *, display_name: str | None = None, enabled: bool | None = None) -> dict[str, Any]:
        """Update index display name and/or enabled status."""
        body: dict[str, Any] = {}
        if display_name is not None:
            body["displayName"] = display_name
        if enabled is not None:
            body["enabled"] = enabled
        return _request(self._base_url, self._api_key, "PATCH", f"/api/v1/indexes/{_e(index_id)}", body=body, timeout=self._timeout)

    def delete_index(self, index_id: str) -> dict[str, Any]:
        """Delete an index and its Typesense collections."""
        return _request(self._base_url, self._api_key, "DELETE", f"/api/v1/indexes/{_e(index_id)}", timeout=self._timeout)

    def get_index_stats(self, index_id: str) -> dict[str, Any]:
        """Get index statistics (document count, usage, ingest queue)."""
        return _request(self._base_url, self._api_key, "GET", f"/api/v1/indexes/{_e(index_id)}/stats", timeout=self._timeout)

    # ── Document operations ──────────────────────────────────────────

    def list_documents(
        self,
        index_id: str,
        *,
        q: str | None = None,
        page: int | None = None,
        per_page: int | None = None,
        filter_by: str | None = None,
    ) -> dict[str, Any]:
        """Browse / list documents in an index.

        Args:
            index_id: The index ID.
            q: Query string (default ``"*"``).
            page: Page number (1-based).
            per_page: Results per page (max 250).
            filter_by: Filter expression.
        """
        params: dict[str, str] = {}
        if q is not None:
            params["q"] = q
        if page is not None:
            params["page"] = str(page)
        if per_page is not None:
            params["perPage"] = str(per_page)
        if filter_by is not None:
            params["filterBy"] = filter_by
        return _request(
            self._base_url, self._api_key, "GET", f"/api/v1/indexes/{_e(index_id)}/documents",
            params=params or None, timeout=self._timeout,
        )

    def upsert_document(self, index_id: str, document_id: str, document: dict[str, Any]) -> dict[str, Any]:
        """Upsert a single document."""
        return _request(
            self._base_url, self._api_key, "PUT",
            f"/api/v1/indexes/{_e(index_id)}/documents/{_e(document_id)}",
            body=document, timeout=self._timeout,
        )

    def batch_upsert_documents(self, index_id: str, documents: list[dict[str, Any]]) -> dict[str, Any]:
        """Batch upsert documents (up to 5000 at a time)."""
        return _request(
            self._base_url, self._api_key, "POST",
            f"/api/v1/indexes/{_e(index_id)}/documents:batch",
            body={"documents": documents}, timeout=self._timeout,
        )

    def batch_delete_documents(self, index_id: str, ids: list[str]) -> dict[str, Any]:
        """Batch delete documents by IDs."""
        return _request(
            self._base_url, self._api_key, "POST",
            f"/api/v1/indexes/{_e(index_id)}/documents:batchDelete",
            body={"ids": ids}, timeout=self._timeout,
        )

    def delete_document(self, index_id: str, document_id: str) -> dict[str, Any]:
        """Delete a single document."""
        return _request(
            self._base_url, self._api_key, "DELETE",
            f"/api/v1/indexes/{_e(index_id)}/documents/{_e(document_id)}",
            timeout=self._timeout,
        )

    # ── Search ───────────────────────────────────────────────────────

    def search(self, index_id: str, *, q: str = "*", **kwargs: Any) -> dict[str, Any]:
        """Search an index (requires a key with search scope).

        Args:
            index_id: The index ID or slug.
            q: Search query (default ``"*"``).
            **kwargs: Additional search parameters (query_by, filter_by, facet_by,
                sort_by, per_page, page, highlight_fields, etc.).
        """
        params: dict[str, Any] = {"q": q}
        params.update(kwargs)
        return _request(
            self._base_url, self._api_key, "POST",
            f"/api/v1/indexes/{_e(index_id)}/search",
            body=params, timeout=self._timeout,
        )

    # ── API Key operations ───────────────────────────────────────────

    def list_keys(self) -> list[dict[str, Any]]:
        """List all API keys in the project."""
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v1/projects/{_e(self._project_id)}/keys",
            timeout=self._timeout,
        )

    def create_key(
        self,
        name: str,
        scopes: list[str],
        index_slug: str,
        *,
        allowed_origins: list[str] | None = None,
        rate_limit_per_minute: int | None = None,
    ) -> dict[str, Any]:
        """Create a new API key.

        Args:
            name: Human-readable key name.
            scopes: Permission scopes (e.g. ``["search"]``, ``["ingest"]``, ``["admin"]``).
            index_slug: The index slug the key should be scoped to.
            allowed_origins: Optional CORS origins list.
            rate_limit_per_minute: Optional rate limit override.
        """
        body: dict[str, Any] = {"name": name, "scopes": scopes, "indexSlug": index_slug}
        if allowed_origins is not None:
            body["allowedOrigins"] = allowed_origins
        if rate_limit_per_minute is not None:
            body["rateLimitPerMinute"] = rate_limit_per_minute
        return _request(
            self._base_url, self._api_key, "POST",
            f"/api/v1/projects/{_e(self._project_id)}/keys",
            body=body, timeout=self._timeout,
        )

    def revoke_key(self, key_id: str) -> dict[str, Any]:
        """Revoke an API key by its ID."""
        return _request(
            self._base_url, self._api_key, "DELETE",
            f"/api/v1/keys/{_e(key_id)}",
            timeout=self._timeout,
        )

    # ── Analytics ────────────────────────────────────────────────────

    def get_analytics(self, period: str | None = None) -> dict[str, Any]:
        """Get aggregated search analytics for the project.

        Args:
            period: Time period (e.g. ``"24h"``, ``"7d"``, ``"30d"``).
        """
        if period:
            return _request(
                self._base_url, self._api_key, "GET",
                f"/api/v1/projects/{_e(self._project_id)}/analytics",
                params={"period": period}, timeout=self._timeout,
            )
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v1/projects/{_e(self._project_id)}/analytics",
            timeout=self._timeout,
        )

    def get_usage(self, window_days: int | None = None) -> dict[str, Any]:
        """Get raw usage data for the project.

        Args:
            window_days: Number of days of usage data to return.
        """
        if window_days is not None:
            return _request(
                self._base_url, self._api_key, "GET",
                f"/api/v1/projects/{_e(self._project_id)}/usage",
                params={"windowDays": str(window_days)}, timeout=self._timeout,
            )
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v1/projects/{_e(self._project_id)}/usage",
            timeout=self._timeout,
        )

    # ── Synonym operations ───────────────────────────────────────────

    def list_synonyms(self, index_id: str) -> list[dict[str, Any]]:
        """List synonyms for an index."""
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v1/indexes/{_e(index_id)}/synonyms",
            timeout=self._timeout,
        )

    def upsert_synonyms(self, index_id: str, synonyms: list[dict[str, str]]) -> dict[str, Any]:
        """Replace all synonyms for an index.

        Args:
            index_id: The index ID.
            synonyms: List of ``{"root": ..., "synonym": ...}`` pairs.
        """
        return _request(
            self._base_url, self._api_key, "PUT",
            f"/api/v1/indexes/{_e(index_id)}/synonyms",
            body={"synonyms": synonyms}, timeout=self._timeout,
        )

    # ── Curation operations ──────────────────────────────────────────

    def list_curations(self, index_id: str) -> list[dict[str, Any]]:
        """List curations (overrides) for an index."""
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v1/indexes/{_e(index_id)}/curations",
            timeout=self._timeout,
        )

    def upsert_curations(self, index_id: str, curations: list[dict[str, Any]]) -> dict[str, Any]:
        """Replace all curations for an index.

        Args:
            index_id: The index ID.
            curations: List of curation rules with ``query``, ``pinnedIds``, ``hiddenIds``.
        """
        return _request(
            self._base_url, self._api_key, "PUT",
            f"/api/v1/indexes/{_e(index_id)}/curations",
            body={"curations": curations}, timeout=self._timeout,
        )


def _e(value: str) -> str:
    """URL-encode a path segment."""
    from urllib.parse import quote
    return quote(value, safe="")
