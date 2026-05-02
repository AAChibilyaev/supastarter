<?php

namespace Aacsearch;

/**
 * Server-side admin client for the AACSearch v1 REST API.
 *
 * Requires an admin-scope API key (`aa_admin_*`). Never bundle in browser code.
 *
 * Usage:
 * ```php
 * $admin = new AdminClient(
 *     'https://app.aacsearch.com',
 *     'aa_admin_...',
 *     'org_xxx'
 * );
 * $indexes = $admin->listIndexes();
 * ```
 */
class AdminClient
{
    private string $baseUrl;
    private string $apiKey;
    private string $projectId;

    public function __construct(
        string $baseUrl,
        string $apiKey,
        string $projectId
    ) {
        if (empty($baseUrl)) throw new \InvalidArgumentException('baseUrl is required');
        if (empty($apiKey)) throw new \InvalidArgumentException('apiKey is required');
        if (empty($projectId)) throw new \InvalidArgumentException('projectId is required');

        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
        $this->projectId = $projectId;
    }

    // ── Project operations ───────────────────────────────────────────

    public function getProject(): array
    {
        return $this->request('GET', '/api/v1/projects');
    }

    public function createProject(string $name, string $slug, ?string $logo = null): array
    {
        $body = ['name' => $name, 'slug' => $slug];
        if ($logo !== null) $body['logo'] = $logo;
        return $this->request('POST', '/api/v1/projects', $body);
    }

    public function getProjectById(string $projectId): array
    {
        return $this->request('GET', "/api/v1/projects/" . urlencode($projectId));
    }

    // ── Index operations ─────────────────────────────────────────────

    public function listIndexes(): array
    {
        return $this->request('GET', "/api/v1/projects/{$this->projectId}/indexes");
    }

    public function getIndex(string $indexId): array
    {
        return $this->request('GET', "/api/v1/indexes/" . urlencode($indexId));
    }

    public function createIndex(string $slug, string $displayName, array $fields, ?string $defaultSortingField = null): array
    {
        $body = [
            'slug' => $slug,
            'displayName' => $displayName,
            'fields' => $fields,
        ];
        if ($defaultSortingField !== null) $body['defaultSortingField'] = $defaultSortingField;
        return $this->request('POST', "/api/v1/projects/{$this->projectId}/indexes", $body);
    }

    public function updateIndex(string $indexId, ?string $displayName = null, ?bool $enabled = null): array
    {
        $body = [];
        if ($displayName !== null) $body['displayName'] = $displayName;
        if ($enabled !== null) $body['enabled'] = $enabled;
        return $this->request('PATCH', "/api/v1/indexes/" . urlencode($indexId), $body);
    }

    public function deleteIndex(string $indexId): array
    {
        return $this->request('DELETE', "/api/v1/indexes/" . urlencode($indexId));
    }

    public function getIndexStats(string $indexId): array
    {
        return $this->request('GET', "/api/v1/indexes/" . urlencode($indexId) . "/stats");
    }

    // ── Document operations ──────────────────────────────────────────

    public function listDocuments(string $indexId, array $query = []): array
    {
        $params = [];
        if (isset($query['q'])) $params['q'] = $query['q'];
        if (isset($query['page'])) $params['page'] = (string)$query['page'];
        if (isset($query['perPage'])) $params['perPage'] = (string)$query['perPage'];
        if (isset($query['filterBy'])) $params['filterBy'] = $query['filterBy'];
        return $this->request('GET', "/api/v1/indexes/" . urlencode($indexId) . "/documents", null, $params);
    }

    public function upsertDocument(string $indexId, string $documentId, array $document): array
    {
        return $this->request(
            'PUT',
            "/api/v1/indexes/" . urlencode($indexId) . "/documents/" . urlencode($documentId),
            $document
        );
    }

    public function batchUpsertDocuments(string $indexId, array $documents): array
    {
        return $this->request(
            'POST',
            "/api/v1/indexes/" . urlencode($indexId) . "/documents:batch",
            ['documents' => $documents]
        );
    }

    public function batchDeleteDocuments(string $indexId, array $ids): array
    {
        return $this->request(
            'POST',
            "/api/v1/indexes/" . urlencode($indexId) . "/documents:batchDelete",
            ['ids' => $ids]
        );
    }

    public function deleteDocument(string $indexId, string $documentId): array
    {
        return $this->request(
            'DELETE',
            "/api/v1/indexes/" . urlencode($indexId) . "/documents/" . urlencode($documentId)
        );
    }

    // ── Search ───────────────────────────────────────────────────────

    public function search(string $indexId, array $params = []): array
    {
        $body = array_merge(['q' => '*'], $params);
        return $this->request('POST', "/api/v1/indexes/" . urlencode($indexId) . "/search", $body);
    }

    // ── API Key operations ───────────────────────────────────────────

    public function listKeys(): array
    {
        return $this->request('GET', "/api/v1/projects/{$this->projectId}/keys");
    }

    public function createKey(string $name, array $scopes, string $indexSlug, ?array $allowedOrigins = null, ?int $rateLimitPerMinute = null): array
    {
        $body = [
            'name' => $name,
            'scopes' => $scopes,
            'indexSlug' => $indexSlug,
        ];
        if ($allowedOrigins !== null) $body['allowedOrigins'] = $allowedOrigins;
        if ($rateLimitPerMinute !== null) $body['rateLimitPerMinute'] = $rateLimitPerMinute;
        return $this->request('POST', "/api/v1/projects/{$this->projectId}/keys", $body);
    }

    public function revokeKey(string $keyId): array
    {
        return $this->request('DELETE', "/api/v1/keys/" . urlencode($keyId));
    }

    // ── Analytics ────────────────────────────────────────────────────

    public function getAnalytics(?string $period = null): array
    {
        $params = $period ? ['period' => $period] : [];
        return $this->request('GET', "/api/v1/projects/{$this->projectId}/analytics", null, $params);
    }

    public function getUsage(?int $windowDays = null): array
    {
        $params = $windowDays ? ['windowDays' => (string)$windowDays] : [];
        return $this->request('GET', "/api/v1/projects/{$this->projectId}/usage", null, $params);
    }

    // ── Synonym operations ───────────────────────────────────────────

    public function listSynonyms(string $indexId): array
    {
        return $this->request('GET', "/api/v1/indexes/" . urlencode($indexId) . "/synonyms");
    }

    public function upsertSynonyms(string $indexId, array $synonyms): array
    {
        return $this->request(
            'PUT',
            "/api/v1/indexes/" . urlencode($indexId) . "/synonyms",
            ['synonyms' => $synonyms]
        );
    }

    // ── Curation operations ──────────────────────────────────────────

    public function listCurations(string $indexId): array
    {
        return $this->request('GET', "/api/v1/indexes/" . urlencode($indexId) . "/curations");
    }

    public function upsertCurations(string $indexId, array $curations): array
    {
        return $this->request(
            'PUT',
            "/api/v1/indexes/" . urlencode($indexId) . "/curations",
            ['curations' => $curations]
        );
    }

    // ── Internal request helper ──────────────────────────────────────

    private function request(string $method, string $path, ?array $body = null, array $queryParams = []): array
    {
        $url = $this->baseUrl . $path;

        if (!empty($queryParams)) {
            $url .= '?' . http_build_query($queryParams);
        }

        $ch = curl_init();
        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json',
            'User-Agent: aacsearch-php-sdk/0.1.0',
        ];

        $options = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => $headers,
        ];

        $method = strtoupper($method);
        if ($method === 'POST') {
            $options[CURLOPT_POST] = true;
            if ($body !== null) {
                $options[CURLOPT_POSTFIELDS] = json_encode($body);
            }
        } elseif ($method === 'PUT') {
            $options[CURLOPT_CUSTOMREQUEST] = 'PUT';
            if ($body !== null) {
                $options[CURLOPT_POSTFIELDS] = json_encode($body);
            }
        } elseif ($method === 'PATCH') {
            $options[CURLOPT_CUSTOMREQUEST] = 'PATCH';
            if ($body !== null) {
                $options[CURLOPT_POSTFIELDS] = json_encode($body);
            }
        } elseif ($method === 'DELETE') {
            $options[CURLOPT_CUSTOMREQUEST] = 'DELETE';
        }

        curl_setopt_array($ch, $options);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new AacsearchException("HTTP request failed: {$error}", 0);
        }

        $data = json_decode($response, true);

        if ($httpCode >= 400) {
            $message = $data['message'] ?? $data['error'] ?? 'Unknown error';
            throw match ($httpCode) {
                401, 403 => new AuthenticationException($message, $httpCode),
                404 => new NotFoundException($message, $httpCode),
                429 => new RateLimitException($message, $httpCode),
                default => new AacsearchException($message, $httpCode),
            };
        }

        return $data ?: [];
    }
}
