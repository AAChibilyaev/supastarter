<?php

namespace Aacsearch;

/**
 * Server-side admin client for the AACSearch v2 REST API.
 *
 * Requires an admin-scope API key (`aa_admin_*`). Never bundle in browser code.
 *
 * v2 introduces:
 *   - Extended error format (requestId, details, documentationUrl)
 *   - Rate limit headers (X-RateLimit-Org-*) returned in all responses
 *   - Cursor-based pagination for document listing
 *   - Document batch upsert with action parameter (upsert/create/update)
 *   - Improved naming consistency
 *
 * Usage:
 * ```php
 * $client = new V2Client(
 *     baseUrl: 'https://app.aacsearch.com',
 *     apiKey: 'aa_admin_...',
 *     projectId: 'org_xxx'
 * );
 *
 * // Get v2 project
 * $project = $client->getProject();
 *
 * // List indexes
 * $indexes = $client->listIndexes();
 *
 * // Search with v2 endpoint
 * $results = $client->search('idx_xxx', ['q' => 'laptop']);
 * ```
 *
 * @see https://docs.aacsearch.com/api/v2
 */
class V2Client
{
    private const API_PATH = '/api/v2';

    private string $baseUrl;
    private string $apiKey;
    private string $projectId;
    private int $timeout;
    private string $userAgent;

    public function __construct(
        string $baseUrl,
        string $apiKey,
        string $projectId,
        int $timeout = 30,
        string $userAgent = 'aacsearch-php-sdk/0.2.0',
    ) {
        if (empty($baseUrl)) {
            throw new \InvalidArgumentException('baseUrl is required');
        }
        if (empty($apiKey)) {
            throw new \InvalidArgumentException('apiKey is required');
        }
        if (empty($projectId)) {
            throw new \InvalidArgumentException('projectId is required');
        }

        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
        $this->projectId = $projectId;
        $this->timeout = $timeout;
        $this->userAgent = $userAgent;
    }

    // ── Project operations ──────────────────────────────────────────────

    /**
     * Get the current project associated with the API key.
     *
     * GET /api/v2/projects
     *
     * @return array{id: string, name: string, slug: string, logo: string|null, membersCount: int, createdAt: string, updatedAt: string}
     */
    public function getProject(): array
    {
        return $this->request('GET', '/projects');
    }

    /**
     * Create a new project.
     *
     * POST /api/v2/projects
     *
     * @param string      $name Display name of the project (max 120 chars).
     * @param string      $slug URL-safe identifier (lowercase, digits, hyphens).
     * @param string|null $logo Optional URL to project logo image.
     *
     * @return array{id: string, name: string, slug: string, logo: string|null, membersCount: int, createdAt: string, updatedAt: string}
     */
    public function createProject(string $name, string $slug, ?string $logo = null): array
    {
        $body = ['name' => $name, 'slug' => $slug];
        if ($logo !== null) {
            $body['logo'] = $logo;
        }

        return $this->request('POST', '/projects', $body);
    }

    /**
     * Get project by ID.
     *
     * GET /api/v2/projects/{projectId}
     *
     * @param string $projectId The project ID.
     *
     * @return array{id: string, name: string, slug: string, logo: string|null, membersCount: int, createdAt: string, updatedAt: string}
     */
    public function getProjectById(string $projectId): array
    {
        return $this->request('GET', '/projects/' . urlencode($projectId));
    }

    // ── Index operations ────────────────────────────────────────────────

    /**
     * List all search indexes for the project.
     *
     * GET /api/v2/projects/{projectId}/indexes
     *
     * @return array<int, array{id: string, slug: string, displayName: string, enabled: bool, projectId: string, documentCount: int, createdAt: string, updatedAt: string}>
     */
    public function listIndexes(): array
    {
        return $this->request('GET', "/projects/{$this->projectId}/indexes");
    }

    /**
     * Get a search index by ID.
     *
     * GET /api/v2/indexes/{indexId}
     *
     * @param string $indexId The index ID.
     *
     * @return array{id: string, slug: string, displayName: string, enabled: bool, projectId: string, documentCount: int, createdAt: string, updatedAt: string}
     */
    public function getIndex(string $indexId): array
    {
        return $this->request('GET', '/indexes/' . urlencode($indexId));
    }

    /**
     * Create a new search index.
     *
     * POST /api/v2/projects/{projectId}/indexes
     *
     * @param string      $slug                 URL-safe index identifier.
     * @param string      $displayName          Human-readable name (max 120 chars).
     * @param array       $fields               Array of field definitions.
     * @param string|null $defaultSortingField  Optional default sort field.
     *
     * @return array{id: string, slug: string, displayName: string, enabled: bool, projectId: string, documentCount: int, createdAt: string, updatedAt: string}
     */
    public function createIndex(string $slug, string $displayName, array $fields, ?string $defaultSortingField = null): array
    {
        $body = [
            'slug' => $slug,
            'displayName' => $displayName,
            'fields' => $fields,
        ];
        if ($defaultSortingField !== null) {
            $body['defaultSortingField'] = $defaultSortingField;
        }

        return $this->request('POST', "/projects/{$this->projectId}/indexes", $body);
    }

    /**
     * Update a search index.
     *
     * PATCH /api/v2/indexes/{indexId}
     *
     * @param string      $indexId              The index ID.
     * @param string|null $displayName          Optional new display name.
     * @param bool|null   $enabled              Optional enabled status.
     * @param string|null $defaultSortingField  Optional default sort field.
     *
     * @return array{id: string, slug: string, displayName: string, enabled: bool, projectId: string, documentCount: int, createdAt: string, updatedAt: string}
     */
    public function updateIndex(string $indexId, ?string $displayName = null, ?bool $enabled = null, ?string $defaultSortingField = null): array
    {
        $body = [];
        if ($displayName !== null) {
            $body['displayName'] = $displayName;
        }
        if ($enabled !== null) {
            $body['enabled'] = $enabled;
        }
        if ($defaultSortingField !== null) {
            $body['defaultSortingField'] = $defaultSortingField;
        }

        return $this->request('PATCH', '/indexes/' . urlencode($indexId), $body);
    }

    /**
     * Permanently delete a search index and its Typesense collection.
     *
     * DELETE /api/v2/indexes/{indexId}
     *
     * @param string $indexId The index ID.
     *
     * @return array Empty array on success (HTTP 204).
     */
    public function deleteIndex(string $indexId): array
    {
        return $this->request('DELETE', '/indexes/' . urlencode($indexId));
    }

    /**
     * Get index statistics.
     *
     * GET /api/v2/indexes/{indexId}/stats
     *
     * @param string $indexId The index ID.
     *
     * @return array{id: string, slug: string, displayName: string, version: int, documentCount: int, usage: array, ingestQueue: array, apiKeysCount: int, createdAt: string, updatedAt: string}
     */
    public function getIndexStats(string $indexId): array
    {
        return $this->request('GET', '/indexes/' . urlencode($indexId) . '/stats');
    }

    // ── Document operations ─────────────────────────────────────────────

    /**
     * List documents with cursor-based pagination.
     *
     * GET /api/v2/indexes/{indexId}/documents
     *
     * @param string      $indexId   The index ID.
     * @param string|null $cursor    Pagination cursor from previous response.
     * @param int         $perPage   Results per page (max 100).
     * @param string|null $filterBy  Typesense filter expression.
     *
     * @return array{hits: array, found: int, nextCursor: string|null, perPage: int}
     */
    public function listDocuments(string $indexId, ?string $cursor = null, int $perPage = 20, ?string $filterBy = null): array
    {
        $params = ['perPage' => (string) $perPage];
        if ($cursor !== null) {
            $params['cursor'] = $cursor;
        }
        if ($filterBy !== null) {
            $params['filterBy'] = $filterBy;
        }

        return $this->request('GET', '/indexes/' . urlencode($indexId) . '/documents', null, $params);
    }

    /**
     * Upsert documents in batch (async — enqueues into ingest buffer).
     *
     * POST /api/v2/indexes/{indexId}/documents
     *
     * @param string $indexId   The index ID.
     * @param array  $documents Array of document objects (each should have a unique `id` field).
     * @param string $action    Import action: 'upsert' (default), 'create', or 'update'.
     *
     * @return array{queued: int, action: string}
     */
    public function upsertDocuments(string $indexId, array $documents, string $action = 'upsert'): array
    {
        return $this->request('POST', '/indexes/' . urlencode($indexId) . '/documents', [
            'documents' => $documents,
            'action' => $action,
        ]);
    }

    /**
     * Get a single document by ID.
     *
     * GET /api/v2/indexes/{indexId}/documents/{documentId}
     *
     * @param string $indexId    The index ID.
     * @param string $documentId The document ID.
     *
     * @return array{hits: array, found: int} Document data.
     */
    public function getDocument(string $indexId, string $documentId): array
    {
        return $this->request(
            'GET',
            '/indexes/' . urlencode($indexId) . '/documents/' . urlencode($documentId)
        );
    }

    /**
     * Upsert a single document.
     *
     * PUT /api/v2/indexes/{indexId}/documents/{documentId}
     *
     * @param string $indexId    The index ID.
     * @param string $documentId The document ID.
     * @param array  $data       Document data.
     *
     * @return array{id: string} Upsert result.
     */
    public function upsertDocument(string $indexId, string $documentId, array $data): array
    {
        return $this->request(
            'PUT',
            '/indexes/' . urlencode($indexId) . '/documents/' . urlencode($documentId),
            $data
        );
    }

    /**
     * Delete a single document.
     *
     * DELETE /api/v2/indexes/{indexId}/documents/{documentId}
     *
     * @param string $indexId    The index ID.
     * @param string $documentId The document ID.
     *
     * @return array{id: string} Deletion result.
     */
    public function deleteDocument(string $indexId, string $documentId): array
    {
        return $this->request(
            'DELETE',
            '/indexes/' . urlencode($indexId) . '/documents/' . urlencode($documentId)
        );
    }

    /**
     * Batch delete documents by IDs.
     *
     * POST /api/v2/indexes/{indexId}/documents:batchDelete
     *
     * @param string $indexId The index ID.
     * @param array  $ids     Array of document IDs to delete.
     *
     * @return array{deleted: int}
     */
    public function batchDeleteDocuments(string $indexId, array $ids): array
    {
        return $this->request(
            'POST',
            '/indexes/' . urlencode($indexId) . '/documents:batchDelete',
            ['ids' => $ids]
        );
    }

    /**
     * Export documents as JSONL or JSON.
     *
     * GET /api/v2/indexes/{indexId}/documents:export
     *
     * @param string      $indexId  The index ID.
     * @param string      $format   Export format: 'jsonl' (default) or 'json'.
     * @param string|null $filterBy Optional Typesense filter expression.
     *
     * @return string Raw export data (streamed).
     */
    public function exportDocuments(string $indexId, string $format = 'jsonl', ?string $filterBy = null): string
    {
        $params = ['format' => $format];
        if ($filterBy !== null) {
            $params['filterBy'] = $filterBy;
        }

        return $this->requestRaw('GET', '/indexes/' . urlencode($indexId) . '/documents:export', $params);
    }

    // ── Search ──────────────────────────────────────────────────────────

    /**
     * Full-text and faceted search across a single index.
     *
     * POST /api/v2/indexes/{indexId}/search
     *
     * @param string $indexId The index ID.
     * @param array  $params  Search parameters (q, queryBy, filterBy, facetBy, sortBy, perPage, page, etc.).
     *
     * @return array{hits: array, found: int, page: int, perPage: int, facetCounts?: array, searchTimeMs: int}
     */
    public function search(string $indexId, array $params = []): array
    {
        $body = array_merge(['q' => '*'], $params);

        return $this->request('POST', '/indexes/' . urlencode($indexId) . '/search', $body);
    }

    /**
     * Execute multiple search queries in a single request.
     *
     * POST /api/v2/multi-search
     *
     * @param array $searches Array of search definitions, each with 'indexId' and 'search' params.
     *
     * @return array<array{hits: array, found: int, page: int, perPage: int, facetCounts?: array, searchTimeMs: int}>
     */
    public function multiSearch(array $searches): array
    {
        return $this->request('POST', '/multi-search', $searches);
    }

    // ── API Key operations ──────────────────────────────────────────────

    /**
     * List API keys for the project.
     *
     * GET /api/v2/projects/{projectId}/keys
     *
     * @return array<int, array{id: string, name: string, prefix: string, scopes: array, allowedOrigins: array, rateLimitPerMinute: int|null, expiresAt: string|null, revokedAt: string|null, lastUsedAt: string|null, createdAt: string, indexSlug?: string, indexDisplayName?: string}>
     */
    public function listKeys(): array
    {
        return $this->request('GET', "/projects/{$this->projectId}/keys");
    }

    /**
     * Create a new API key.
     *
     * POST /api/v2/projects/{projectId}/keys
     *
     * @param string        $description        Human-readable description.
     * @param array         $scopes             Key scopes: 'admin', 'ingest', 'search'.
     * @param int|null      $rateLimitPerMinute Optional per-minute rate limit.
     * @param array|null    $allowedOrigins     Optional CORS allowed origins (empty for all).
     *
     * @return array{id: string, name: string, prefix: string, rawKey: string, scopes: array, allowedOrigins: array, rateLimitPerMinute: int|null, createdAt: string}
     */
    public function createKey(string $description, array $scopes, ?int $rateLimitPerMinute = null, ?array $allowedOrigins = null): array
    {
        $body = [
            'description' => $description,
            'scopes' => $scopes,
        ];
        if ($rateLimitPerMinute !== null) {
            $body['rateLimitPerMinute'] = $rateLimitPerMinute;
        }
        if ($allowedOrigins !== null) {
            $body['allowedOrigins'] = $allowedOrigins;
        }

        return $this->request('POST', "/projects/{$this->projectId}/keys", $body);
    }

    /**
     * Revoke (delete) an API key.
     *
     * DELETE /api/v2/keys/{keyId}
     *
     * @param string $keyId The key ID.
     *
     * @return array{id: string} Revocation result.
     */
    public function revokeKey(string $keyId): array
    {
        return $this->request('DELETE', '/keys/' . urlencode($keyId));
    }

    // ── Synonym operations ──────────────────────────────────────────────

    /**
     * List synonyms for an index.
     *
     * GET /api/v2/indexes/{indexId}/synonyms
     *
     * @param string $indexId The index ID.
     *
     * @return array{id: string, root: string, replacements: array, locale?: string}
     */
    public function listSynonyms(string $indexId): array
    {
        return $this->request('GET', '/indexes/' . urlencode($indexId) . '/synonyms');
    }

    /**
     * Create a new synonym.
     *
     * POST /api/v2/indexes/{indexId}/synonyms
     *
     * @param string $indexId      The index ID.
     * @param array  $synonymData  Synonym data: root, replacements, locale (optional).
     *
     * @return array{id: string, root: string, replacements: array}
     */
    public function createSynonym(string $indexId, array $synonymData): array
    {
        return $this->request('POST', '/indexes/' . urlencode($indexId) . '/synonyms', $synonymData);
    }

    /**
     * Upsert synonyms in batch.
     *
     * PUT /api/v2/indexes/{indexId}/synonyms
     *
     * @param string $indexId  The index ID.
     * @param array  $synonyms Array of synonym definitions.
     *
     * @return array{upserted: int}
     */
    public function upsertSynonyms(string $indexId, array $synonyms): array
    {
        return $this->request('PUT', '/indexes/' . urlencode($indexId) . '/synonyms', $synonyms);
    }

    /**
     * Delete a synonym.
     *
     * DELETE /api/v2/indexes/{indexId}/synonyms?synonymId={synonymId}
     *
     * @param string $indexId   The index ID.
     * @param string $synonymId The synonym ID.
     *
     * @return array{id: string}
     */
    public function deleteSynonym(string $indexId, string $synonymId): array
    {
        return $this->request(
            'DELETE',
            '/indexes/' . urlencode($indexId) . '/synonyms',
            null,
            ['synonymId' => $synonymId]
        );
    }

    // ── Curation operations ─────────────────────────────────────────────

    /**
     * List curations for an index.
     *
     * GET /api/v2/indexes/{indexId}/curations
     *
     * @param string $indexId The index ID.
     *
     * @return array<int, array{id: string, query: string, pinnedIds: array, hiddenIds: array, boostedIds: array}>
     */
    public function listCurations(string $indexId): array
    {
        return $this->request('GET', '/indexes/' . urlencode($indexId) . '/curations');
    }

    /**
     * Create a new curation.
     *
     * POST /api/v2/indexes/{indexId}/curations
     *
     * @param string $indexId      The index ID.
     * @param array  $curationData Curation data: query, pinnedIds (optional), hiddenIds (optional), boostedIds (optional).
     *
     * @return array{id: string, query: string, pinnedIds: array, hiddenIds: array, boostedIds: array}
     */
    public function createCuration(string $indexId, array $curationData): array
    {
        return $this->request('POST', '/indexes/' . urlencode($indexId) . '/curations', $curationData);
    }

    /**
     * Upsert curations in batch.
     *
     * PUT /api/v2/indexes/{indexId}/curations
     *
     * @param string $indexId   The index ID.
     * @param array  $curations Array of curation definitions.
     *
     * @return array{upserted: int}
     */
    public function upsertCurations(string $indexId, array $curations): array
    {
        return $this->request('PUT', '/indexes/' . urlencode($indexId) . '/curations', $curations);
    }

    // ── Analytics ───────────────────────────────────────────────────────

    /**
     * Get search analytics for the project.
     *
     * GET /api/v2/projects/{projectId}/analytics
     *
     * @param string|null $period Optional period (e.g. '7d', '30d').
     *
     * @return array{totalSearches: int, totalSessions: int, topQueries: array, zeroResultQueries: array, topClickedProducts: array, ctr: float, searchesOverTime: array}
     */
    public function getAnalytics(?string $period = null): array
    {
        $params = $period !== null ? ['period' => $period] : [];

        return $this->request('GET', "/projects/{$this->projectId}/analytics", null, $params);
    }

    /**
     * Get usage data for the project.
     *
     * GET /api/v2/projects/{projectId}/usage
     *
     * @param int|null $windowDays Optional lookback window in days.
     *
     * @return array{since: string, rows: array}
     */
    public function getUsage(?int $windowDays = null): array
    {
        $params = $windowDays !== null ? ['windowDays' => (string) $windowDays] : [];

        return $this->request('GET', "/projects/{$this->projectId}/usage", null, $params);
    }

    // ── OpenAPI ─────────────────────────────────────────────────────────

    /**
     * Get the OpenAPI 3.1 specification for the v2 API.
     *
     * GET /api/v2/openapi.json
     *
     * @return array The raw OpenAPI 3.1 JSON document.
     */
    public function getOpenApiSpec(): array
    {
        return $this->request('GET', '/openapi.json');
    }

    // ── Internal request helpers ────────────────────────────────────────

    /**
     * Execute an HTTP request and return the parsed JSON response.
     *
     * @param string     $method      HTTP method.
     * @param string     $path        API path relative to /api/v2.
     * @param array|null $body        Request body (JSON-encoded for mutating methods).
     * @param array      $queryParams Query string parameters.
     *
     * @return array Decoded response.
     *
     * @throws AacsearchException
     * @throws AuthenticationException
     * @throws NotFoundException
     * @throws RateLimitException
     */
    private function request(string $method, string $path, ?array $body = null, array $queryParams = []): array
    {
        $url = $this->buildUrl($path, $queryParams);

        [$responseBody, $httpCode] = $this->sendRequest($method, $url, $body);

        $data = $responseBody !== '' ? json_decode($responseBody, true) : [];

        if ($httpCode >= 400) {
            $this->handleV2Error($data, $httpCode);
        }

        return $data ?: [];
    }

    /**
     * Execute an HTTP request and return the raw response body (for exports).
     *
     * @param string $method      HTTP method.
     * @param string $path        API path relative to /api/v2.
     * @param array  $queryParams Query string parameters.
     *
     * @return string Raw response body.
     *
     * @throws AacsearchException
     */
    private function requestRaw(string $method, string $path, array $queryParams = []): string
    {
        $url = $this->buildUrl($path, $queryParams);

        [$responseBody, $httpCode] = $this->sendRequest($method, $url, null);

        if ($httpCode >= 400) {
            $data = $responseBody !== '' ? json_decode($responseBody, true) : [];
            $this->handleV2Error($data, $httpCode);
        }

        return $responseBody;
    }

    /**
     * Build the full URL.
     */
    private function buildUrl(string $path, array $queryParams = []): string
    {
        $url = $this->baseUrl . self::API_PATH . $path;

        if (!empty($queryParams)) {
            $url .= '?' . http_build_query($queryParams);
        }

        return $url;
    }

    /**
     * Send an HTTP request via cURL.
     *
     * @return array{0: string, 1: int} [responseBody, httpCode]
     *
     * @throws AacsearchException on cURL error.
     */
    private function sendRequest(string $method, string $url, ?array $body = null): array
    {
        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: ' . $this->userAgent,
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_HEADER => true,
        ]);

        if ($body !== null && in_array(strtoupper($method), ['POST', 'PUT', 'PATCH'], true)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $curlError = curl_error($ch);
        $curlErrno = curl_errno($ch);
        curl_close($ch);

        if ($curlErrno !== 0) {
            throw new AacsearchException(
                'AACsearch API request failed: cURL error ' . $curlErrno . ' - ' . $curlError
            );
        }

        $responseBody = substr($response, $headerSize);

        return [$responseBody, $httpCode];
    }

    /**
     * Handle v2 extended error format.
     *
     * v2 errors include: requestId, error, message, statusCode, details, documentationUrl.
     *
     * @param array $data     Decoded error response.
     * @param int   $httpCode HTTP status code.
     *
     * @throws AuthenticationException
     * @throws NotFoundException
     * @throws RateLimitException
     * @throws AacsearchException
     */
    private function handleV2Error(array $data, int $httpCode): void
    {
        $message = $data['message'] ?? $data['error'] ?? 'Unknown error';

        // v2 extended error format includes requestId — include it in the message for debugging
        if (isset($data['requestId'])) {
            $message .= " (requestId: {$data['requestId']})";
        }

        if (isset($data['details']) && is_array($data['details']) && count($data['details']) > 0) {
            $detailMessages = [];
            foreach ($data['details'] as $detail) {
                $path = isset($detail['path']) ? '[' . implode('.', (array) $detail['path']) . '] ' : '';
                $detailMessages[] = $path . ($detail['message'] ?? '');
            }
            if (!empty($detailMessages)) {
                $message .= ': ' . implode('; ', $detailMessages);
            }
        }

        throw match ($httpCode) {
            400 => new ValidationException($message, $httpCode),
            401, 403 => new AuthenticationException($message, $httpCode),
            404 => new NotFoundException($message, $httpCode),
            429 => new RateLimitException($message, $httpCode),
            default => new AacsearchException($message, $httpCode),
        };
    }
}
