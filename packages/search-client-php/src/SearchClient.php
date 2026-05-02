<?php

namespace Aacsearch;

/**
 * Browser-safe public search client for AACSearch.
 *
 * Only works with `ss_search_*` (search-only) or `ss_scoped_*` tokens.
 */
class SearchClient
{
    private string $baseUrl;
    private string $apiKey;
    private string $indexSlug;

    public function __construct(
        string $baseUrl,
        string $apiKey,
        string $indexSlug
    ) {
        if (empty($baseUrl)) throw new \InvalidArgumentException('baseUrl is required');
        if (empty($apiKey)) throw new \InvalidArgumentException('apiKey is required');
        if (empty($indexSlug)) throw new \InvalidArgumentException('indexSlug is required');

        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
        $this->indexSlug = $indexSlug;
    }

    /**
     * Search the index with a text query and optional filters.
     */
    public function search(array $params = []): array
    {
        $body = array_merge(['q' => '*'], $params);
        return $this->request('POST', "/api/v1/indexes/{$this->indexSlug}/search", $body);
    }

    /**
     * Execute multiple search queries in a single request.
     */
    public function multiSearch(array $searches): array
    {
        return $this->request('POST', '/api/v1/multi-search', ['searches' => $searches]);
    }

    private function request(string $method, string $path, ?array $body = null): array
    {
        $url = $this->baseUrl . $path;
        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->apiKey,
                'Content-Type: application/json',
                'User-Agent: aacsearch-php-sdk/0.1.0',
            ],
        ]);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($body !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            }
        } elseif ($method === 'GET') {
            curl_setopt($ch, CURLOPT_HTTPGET, true);
        }

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
