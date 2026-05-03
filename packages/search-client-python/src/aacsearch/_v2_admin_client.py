"""
Server-side administration client for the AACSearch v2 REST API.

Requires an admin-scope API key (``aa_admin_*``). Never bundle in browser code.
"""

from __future__ import annotations

from typing import Any

from ._transport import _request


class V2AdminClient:
    """Client for managing AACSearch v2 resources — projects, indexes, documents,
    keys, synonyms, curations, analytics, and usage.

    Args:
        base_url: Origin of the AACSearch deployment (e.g. ``https://app.aacsearch.com``).
        api_key: An admin-scope API key (``aa_admin_...``).
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
            raise ValueError("V2AdminClient: base_url is required")
        if not api_key:
            raise ValueError("V2AdminClient: api_key is required")
        if not project_id:
            raise ValueError("V2AdminClient: project_id is required")

        self._base_url = base_url
        self._api_key = api_key
        self._project_id = project_id
        self._timeout = timeout

    # ── Project operations ───────────────────────────────────────────

    def get_project(self) -> dict[str, Any]:
        """Get the current project (organization) details.

        GET /api/v2/projects
        """
        return _request(self._base_url, self._api_key, "GET", "/api/v2/projects", timeout=self._timeout)

    def create_project(self, name: str, slug: str, logo: str | None = None) -> dict[str, Any]:
        """Create a new project (organization).

        POST /api/v2/projects

        Args:
            name: Display name (max 120 chars).
            slug: URL-safe identifier (``^[a-z0-9][a-z0-9-]*$``, max 64 chars).
            logo: Optional logo URL.
        """
        body: dict[str, Any] = {"name": name, "slug": slug}
        if logo is not None:
            body["logo"] = logo
        return _request(self._base_url, self._api_key, "POST", "/api/v2/projects", body=body, timeout=self._timeout)

    def get_project_by_id(self, project_id: str) -> dict[str, Any]:
        """Get a project by its ID.

        GET /api/v2/projects/{projectId}

        Args:
            project_id: The project (organization) ID.
        """
        return _request(self._base_url, self._api_key, "GET", f"/api/v2/projects/{_e(project_id)}", timeout=self._timeout)

    # ── Index operations ─────────────────────────────────────────────

    def list_indexes(self) -> list[dict[str, Any]]:
        """List all indexes in the project.

        GET /api/v2/projects/{projectId}/indexes
        """
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v2/projects/{_e(self._project_id)}/indexes",
            timeout=self._timeout,
        )

    def get_index(self, index_id: str) -> dict[str, Any]:
        """Get a single index by its ID.

        GET /api/v2/indexes/{indexId}
        """
        return _request(self._base_url, self._api_key, "GET", f"/api/v2/indexes/{_e(index_id)}", timeout=self._timeout)

    def create_index(
        self,
        slug: str,
        display_name: str,
        fields: list[dict[str, Any]],
        default_sorting_field: str | None = None,
    ) -> dict[str, Any]:
        """Create a new search index.

        POST /api/v2/projects/{projectId}/indexes

        Args:
            slug: URL-safe index identifier.
            display_name: Human-readable name.
            fields: Array of field definitions (``name``, ``type``, ``facet``, ``optional``, etc.).
            default_sorting_field: Optional default sort field name.
        """
        body: dict[str, Any] = {"slug": slug, "displayName": display_name, "fields": fields}
        if default_sorting_field is not None:
            body["defaultSortingField"] = default_sorting_field
        return _request(
            self._base_url, self._api_key, "POST",
            f"/api/v2/projects/{_e(self._project_id)}/indexes",
            body=body, timeout=self._timeout,
        )

    def update_index(
        self,
        index_id: str,
        *,
        display_name: str | None = None,
        enabled: bool | None = None,
        default_sorting_field: str | None = None,
    ) -> dict[str, Any]:
        """Update index metadata.

        PATCH /api/v2/indexes/{indexId}

        Args:
            index_id: The index ID.
            display_name: New display name.
            enabled: Whether the index is enabled.
            default_sorting_field: New default sort field.
        """
        body: dict[str, Any] = {}
        if display_name is not None:
            body["displayName"] = display_name
        if enabled is not None:
            body["enabled"] = enabled
        if default_sorting_field is not None:
            body["defaultSortingField"] = default_sorting_field
        return _request(
            self._base_url, self._api_key, "PATCH",
            f"/api/v2/indexes/{_e(index_id)}",
            body=body, timeout=self._timeout,
        )

    def delete_index(self, index_id: str) -> dict[str, Any]:
        """Permanently delete an index and its Typesense collection.

        DELETE /api/v2/indexes/{indexId}
        """
        return _request(
            self._base_url, self._api_key, "DELETE",
            f"/api/v2/indexes/{_e(index_id)}",
            timeout=self._timeout,
        )

    def get_index_stats(self, index_id: str) -> dict[str, Any]:
        """Get index statistics (document count, usage, ingest queue).

        GET /api/v2/indexes/{indexId}/stats
        """
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v2/indexes/{_e(index_id)}/stats",
            timeout=self._timeout,
        )

    # ── Document operations ──────────────────────────────────────────

    def list_documents(
        self,
        index_id: str,
        *,
        cursor: str | None = None,
        per_page: int | None = None,
        filter_by: str | None = None,
    ) -> dict[str, Any]:
        """List documents in an index (cursor-based pagination).

        GET /api/v2/indexes/{indexId}/documents

        Args:
            index_id: The index ID.
            cursor: Pagination cursor from a previous response.
            per_page: Results per page (max 100, default 20).
            filter_by: Typesense filter expression.
        """
        params: dict[str, str] = {}
        if cursor is not None:
            params["cursor"] = cursor
        if per_page is not None:
            params["perPage"] = str(per_page)
        if filter_by is not None:
            params["filterBy"] = filter_by
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v2/indexes/{_e(index_id)}/documents",
            params=params or None, timeout=self._timeout,
        )

    def upsert_documents(
        self,
        index_id: str,
        documents: list[dict[str, Any]],
        action: str = "upsert",
    ) -> dict[str, Any]:
        """Upsert documents into an index (batch, async via ingest buffer).

        POST /api/v2/indexes/{indexId}/documents

        Args:
            index_id: The index ID.
            documents: Array of document objects. Each should have a unique ``id`` field.
            action: Import action — ``"upsert"`` (default), ``"create"``, or ``"update"``.
        """
        return _request(
            self._base_url, self._api_key, "POST",
            f"/api/v2/indexes/{_e(index_id)}/documents",
            body={"documents": documents, "action": action},
            timeout=self._timeout,
        )

    def get_document(self, index_id: str, document_id: str) -> dict[str, Any]:
        """Get a single document by its ID.

        GET /api/v2/indexes/{indexId}/documents/{documentId}
        """
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v2/indexes/{_e(index_id)}/documents/{_e(document_id)}",
            timeout=self._timeout,
        )

    def upsert_document(self, index_id: str, document_id: str, document: dict[str, Any]) -> dict[str, Any]:
        """Upsert a single document.

        PUT /api/v2/indexes/{indexId}/documents/{documentId}
        """
        return _request(
            self._base_url, self._api_key, "PUT",
            f"/api/v2/indexes/{_e(index_id)}/documents/{_e(document_id)}",
            body=document, timeout=self._timeout,
        )

    def delete_document(self, index_id: str, document_id: str) -> dict[str, Any]:
        """Delete a single document.

        DELETE /api/v2/indexes/{indexId}/documents/{documentId}
        """
        return _request(
            self._base_url, self._api_key, "DELETE",
            f"/api/v2/indexes/{_e(index_id)}/documents/{_e(document_id)}",
            timeout=self._timeout,
        )

    def batch_delete_documents(self, index_id: str, ids: list[str]) -> dict[str, Any]:
        """Batch delete documents by IDs.

        POST /api/v2/indexes/{indexId}/documents:batchDelete
        """
        return _request(
            self._base_url, self._api_key, "POST",
            f"/api/v2/indexes/{_e(index_id)}/documents:batchDelete",
            body={"ids": ids}, timeout=self._timeout,
        )

    def export_documents(
        self,
        index_id: str,
        format: str = "jsonl",
        filter_by: str | None = None,
    ) -> dict[str, Any]:
        """Export documents from an index.

        GET /api/v2/indexes/{indexId}/documents:export

        Args:
            index_id: The index ID.
            format: Export format — ``"jsonl"`` (default) or ``"json"``.
            filter_by: Optional Typesense filter expression.
        """
        params: dict[str, str] = {"format": format}
        if filter_by is not None:
            params["filterBy"] = filter_by
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v2/indexes/{_e(index_id)}/documents:export",
            params=params, timeout=self._timeout,
        )

    # ── Search (admin) ─────────────────────────────────────────────────

    def search(self, index_id: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        """Search an index (requires a key with search scope).

        POST /api/v2/indexes/{indexId}/search

        Args:
            index_id: The index ID or slug.
            params: Search parameters (q, queryBy, filterBy, facetBy, sortBy,
                perPage, page, highlightFields, includeFields, excludeFields,
                numTypos, prefix, exact, prioritizeExactMatch, etc.).
        """
        return _request(
            self._base_url, self._api_key, "POST",
            f"/api/v2/indexes/{_e(index_id)}/search",
            body=params or {"q": "*"}, timeout=self._timeout,
        )

    def multi_search(self, searches: list[dict[str, Any]]) -> dict[str, Any]:
        """Execute multiple search queries across indexes in a single request.

        POST /api/v2/multi-search

        Args:
            searches: List of search spec dicts. Each must contain ``indexId``
                (slug or ID) and ``search`` (the search params dict).
        """
        return _request(
            self._base_url, self._api_key, "POST",
            "/api/v2/multi-search",
            body=searches, timeout=self._timeout,
        )

    # ── API Key operations ───────────────────────────────────────────

    def list_keys(self) -> list[dict[str, Any]]:
        """List all API keys in the project.

        GET /api/v2/projects/{projectId}/keys
        """
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v2/projects/{_e(self._project_id)}/keys",
            timeout=self._timeout,
        )

    def create_key(
        self,
        description: str,
        scopes: list[str],
        *,
        allowed_origins: list[str] | None = None,
        rate_limit_per_minute: int | None = None,
    ) -> dict[str, Any]:
        """Create a new API key.

        POST /api/v2/projects/{projectId}/keys

        Args:
            description: Human-readable key description.
            scopes: Permission scopes (e.g. ``["search"]``, ``["ingest"]``, ``["admin"]``).
            allowed_origins: Optional CORS origins list.
            rate_limit_per_minute: Optional rate limit override.
        """
        body: dict[str, Any] = {"description": description, "scopes": scopes}
        if allowed_origins is not None:
            body["allowedOrigins"] = allowed_origins
        if rate_limit_per_minute is not None:
            body["rateLimitPerMinute"] = rate_limit_per_minute
        return _request(
            self._base_url, self._api_key, "POST",
            f"/api/v2/projects/{_e(self._project_id)}/keys",
            body=body, timeout=self._timeout,
        )

    def revoke_key(self, key_id: str) -> dict[str, Any]:
        """Revoke an API key by its ID.

        DELETE /api/v2/keys/{keyId}
        """
        return _request(
            self._base_url, self._api_key, "DELETE",
            f"/api/v2/keys/{_e(key_id)}",
            timeout=self._timeout,
        )

    # ── Synonym operations ───────────────────────────────────────────

    def list_synonyms(self, index_id: str) -> list[dict[str, Any]]:
        """List synonyms for an index.

        GET /api/v2/indexes/{indexId}/synonyms
        """
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v2/indexes/{_e(index_id)}/synonyms",
            timeout=self._timeout,
        )

    def create_synonym(self, index_id: str, synonym: dict[str, Any]) -> dict[str, Any]:
        """Create a single synonym.

        POST /api/v2/indexes/{indexId}/synonyms

        Args:
            index_id: The index ID.
            synonym: Synonym definition (root + synonym mapping).
        """
        return _request(
            self._base_url, self._api_key, "POST",
            f"/api/v2/indexes/{_e(index_id)}/synonyms",
            body=synonym, timeout=self._timeout,
        )

    def upsert_synonyms(self, index_id: str, synonyms: list[dict[str, Any]]) -> dict[str, Any]:
        """Upsert synonyms (batch replace all synonyms for an index).

        PUT /api/v2/indexes/{indexId}/synonyms

        Args:
            index_id: The index ID.
            synonyms: List of synonym definitions.
        """
        return _request(
            self._base_url, self._api_key, "PUT",
            f"/api/v2/indexes/{_e(index_id)}/synonyms",
            body={"synonyms": synonyms}, timeout=self._timeout,
        )

    def delete_synonym(self, index_id: str, synonym_id: str) -> dict[str, Any]:
        """Delete a single synonym.

        DELETE /api/v2/indexes/{indexId}/synonyms?symonymId={synonymId}

        Args:
            index_id: The index ID.
            synonym_id: The synonym ID to delete.
        """
        return _request(
            self._base_url, self._api_key, "DELETE",
            f"/api/v2/indexes/{_e(index_id)}/synonyms",
            params={"synonymId": synonym_id}, timeout=self._timeout,
        )

    # ── Curation operations ──────────────────────────────────────────

    def list_curations(self, index_id: str) -> list[dict[str, Any]]:
        """List curations (overrides) for an index.

        GET /api/v2/indexes/{indexId}/curations
        """
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v2/indexes/{_e(index_id)}/curations",
            timeout=self._timeout,
        )

    def create_curation(self, index_id: str, curation: dict[str, Any]) -> dict[str, Any]:
        """Create a single curation rule.

        POST /api/v2/indexes/{indexId}/curations

        Args:
            index_id: The index ID.
            curation: Curation rule with ``query``, ``pinnedIds``, ``hiddenIds``.
        """
        return _request(
            self._base_url, self._api_key, "POST",
            f"/api/v2/indexes/{_e(index_id)}/curations",
            body=curation, timeout=self._timeout,
        )

    def upsert_curations(self, index_id: str, curations: list[dict[str, Any]]) -> dict[str, Any]:
        """Upsert curations (batch replace all curations for an index).

        PUT /api/v2/indexes/{indexId}/curations

        Args:
            index_id: The index ID.
            curations: List of curation rules.
        """
        return _request(
            self._base_url, self._api_key, "PUT",
            f"/api/v2/indexes/{_e(index_id)}/curations",
            body={"curations": curations}, timeout=self._timeout,
        )

    # ── Analytics ────────────────────────────────────────────────────

    def get_analytics(self, period: str | None = None) -> dict[str, Any]:
        """Get aggregated search analytics for the project.

        GET /api/v2/projects/{projectId}/analytics

        Args:
            period: Time period (e.g. ``\"24h\"``, ``\"7d\"``, ``\"30d\"``).
        """
        if period:
            return _request(
                self._base_url, self._api_key, "GET",
                f"/api/v2/projects/{_e(self._project_id)}/analytics",
                params={"period": period}, timeout=self._timeout,
            )
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v2/projects/{_e(self._project_id)}/analytics",
            timeout=self._timeout,
        )

    # ── Usage ────────────────────────────────────────────────────────

    def get_usage(self, window_days: int | None = None) -> dict[str, Any]:
        """Get raw usage data for the project.

        GET /api/v2/projects/{projectId}/usage

        Args:
            window_days: Number of days of usage data to return.
        """
        if window_days is not None:
            return _request(
                self._base_url, self._api_key, "GET",
                f"/api/v2/projects/{_e(self._project_id)}/usage",
                params={"windowDays": str(window_days)}, timeout=self._timeout,
            )
        return _request(
            self._base_url, self._api_key, "GET",
            f"/api/v2/projects/{_e(self._project_id)}/usage",
            timeout=self._timeout,
        )


def _e(value: str) -> str:
    """URL-encode a path segment."""
    from urllib.parse import quote

    return quote(value, safe="")
