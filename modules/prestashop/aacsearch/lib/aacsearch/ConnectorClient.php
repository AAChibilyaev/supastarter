<?php

namespace Aacsearch;

/**
 * Connector API client for CMS sync operations (WordPress, PrestaShop, Bitrix).
 *
 * Handles authentication via Bearer token (ss_connector_* prefix) and
 * communicates with the AACsearch Connector API for handshake, full sync,
 * delta sync, product deletion (single + batch), and diagnostics.
 *
 * Usage:
 * ```php
 * $connector = new ConnectorClient(
 *     'https://api.aacsearch.com',
 *     'proj_xxx',
 *     'ss_connector_...'
 * );
 * $connector->handshake();
 * $connector->fullSync($documents);
 * $connector->deltaSync($documents);
 * $connector->deleteProduct('123');
 * $connector->batchDelete(['123', '456']);
 * $connector->sendDiagnostics([...]);
 * ```
 */
class ConnectorClient
{
    /**
     * Base URL of the AACsearch Connector API.
     *
     * @var string
     */
    protected string $apiUrl;

    /**
     * Project identifier.
     *
     * @var string
     */
    protected string $projectId;

    /**
     * Bearer token for API authentication (ss_connector_*).
     *
     * @var string
     */
    protected string $connectorToken;

    /**
     * Default connection timeout in seconds.
     */
    protected int $timeout;

    /**
     * User-Agent string for API requests.
     */
    protected string $userAgent;

    /**
     * @param string $apiUrl         Base URL of the Connector API.
     * @param string $projectId      AACsearch project ID.
     * @param string $connectorToken ss_connector_* token.
     * @param int    $timeout        Request timeout in seconds (default: 30).
     * @param string $userAgent      User-Agent header value (optional).
     */
    public function __construct(
        string $apiUrl,
        string $projectId,
        string $connectorToken,
        int $timeout = 30,
        string $userAgent = 'aacsearch-php-sdk/0.1.0'
    ) {
        $this->apiUrl = rtrim($apiUrl, '/');
        $this->projectId = $projectId;
        $this->connectorToken = $connectorToken;
        $this->timeout = $timeout;
        $this->userAgent = $userAgent;
    }

    /**
     * Perform a handshake with the AACsearch Connector API.
     * POST /api/connectors/handshake
     *
     * @param string $moduleVersion CMS module version.
     * @param string $platform      Platform identifier (wordpress, prestashop, bitrix).
     *
     * @return bool True if handshake succeeded (status === 'active').
     *
     * @throws AacsearchException
     */
    public function handshake(string $moduleVersion = '1.0.0', string $platform = 'cms'): bool
    {
        $response = $this->request('POST', '/api/connectors/handshake', [
            'moduleVersion' => $moduleVersion,
            'platform'      => $platform,
        ]);

        return $response !== null && isset($response['status']) && $response['status'] === 'active';
    }

    /**
     * Send a full sync of all documents.
     * POST /api/projects/{projectId}/sync/full
     *
     * @param array $documents Array of ProductDocument arrays.
     * @param int   $timeout   Override timeout for full sync (defaults to client timeout).
     *
     * @return bool True if sync succeeded.
     *
     * @throws AacsearchException
     */
    public function fullSync(array $documents, int $timeout = null): bool
    {
        $response = $this->request(
            'POST',
            '/api/projects/' . urlencode($this->projectId) . '/sync/full',
            ['products' => $documents],
            $timeout
        );

        return $response !== null && !isset($response['error']);
    }

    /**
     * Send a delta sync of changed documents.
     * POST /api/projects/{projectId}/sync/delta
     *
     * @param array $documents Array of ProductDocument arrays.
     *
     * @return bool True if sync succeeded.
     *
     * @throws AacsearchException
     */
    public function deltaSync(array $documents): bool
    {
        $response = $this->request(
            'POST',
            '/api/projects/' . urlencode($this->projectId) . '/sync/delta',
            ['products' => $documents]
        );

        return $response !== null && !isset($response['error']);
    }

    /**
     * Delete a single document from AACsearch by its external ID.
     * DELETE /api/projects/{projectId}/products/{externalId}
     *
     * @param string $externalId The document's external ID.
     *
     * @return bool True if deletion succeeded.
     *
     * @throws AacsearchException
     */
    public function deleteProduct(string $externalId): bool
    {
        $response = $this->request(
            'DELETE',
            '/api/projects/' . urlencode($this->projectId) . '/products/' . urlencode($externalId)
        );

        return $response !== null && !isset($response['error']);
    }

    /**
     * Delete a batch of documents from AACsearch.
     * DELETE /api/connector/documents
     *
     * Accepts up to 500 IDs per API call; larger arrays are automatically
     * split into 500-item chunks.
     *
     * @param array $externalIds Array of external document IDs to delete.
     *
     * @return int Total number of deleted documents.
     *
     * @throws AacsearchException
     */
    public function batchDelete(array $externalIds): int
    {
        if (empty($externalIds)) {
            return 0;
        }

        $total = 0;
        foreach (array_chunk($externalIds, 500) as $chunk) {
            $response = $this->request('DELETE', '/api/connector/documents', ['externalIds' => $chunk]);
            $total += (int) ($response['deleted'] ?? count($chunk));
        }

        return $total;
    }

    /**
     * Send diagnostics data to AACsearch.
     * POST /api/projects/{projectId}/diagnostics
     *
     * @param array $diagnostics Associative array of diagnostic data.
     *
     * @return bool True if diagnostics were accepted.
     *
     * @throws AacsearchException
     */
    public function sendDiagnostics(array $diagnostics = []): bool
    {
        $defaults = [
            'moduleVersion' => '1.0.0',
            'phpVersion'    => PHP_VERSION,
            'shopUrl'       => '',
            'totalProducts' => 0,
            'errors'        => [],
        ];

        $response = $this->request(
            'POST',
            '/api/projects/' . urlencode($this->projectId) . '/diagnostics',
            array_merge($defaults, $diagnostics)
        );

        return $response !== null && !isset($response['error']);
    }

    /**
     * Validate that the client has the minimum required configuration.
     *
     * @return bool
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiUrl)
            && !empty($this->projectId)
            && !empty($this->connectorToken);
    }

    /**
     * Execute an HTTP request against the AACsearch API.
     *
     * @param string      $method  HTTP method (GET, POST, DELETE, etc.).
     * @param string      $path    API path (e.g., /api/connectors/handshake).
     * @param array|null  $body    Request body payload (optional).
     * @param int|null    $timeout Request timeout override (optional).
     *
     * @return array|null Decoded response array, or null on failure.
     *
     * @throws AacsearchException
     */
    protected function request(string $method, string $path, ?array $body = null, ?int $timeout = null): ?array
    {
        $url = $this->apiUrl . $path;

        $headers = [
            'Authorization: Bearer ' . $this->connectorToken,
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: ' . $this->userAgent,
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_CUSTOMREQUEST  => strtoupper($method),
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout ?? $this->timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false,
        ]);

        if ($body !== null && in_array(strtoupper($method), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $responseBody = curl_exec($ch);
        $httpCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError    = curl_error($ch);
        $curlErrno    = curl_errno($ch);
        curl_close($ch);

        if ($curlErrno !== 0) {
            throw new AacsearchException(
                'AACsearch API request failed: cURL error ' . $curlErrno . ' - ' . $curlError
            );
        }

        // 2xx responses are successful
        if ($httpCode >= 200 && $httpCode < 300) {
            if (empty($responseBody)) {
                return [];
            }

            $decoded = json_decode($responseBody, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new AacsearchException(
                    'AACsearch API: invalid JSON response (' . json_last_error_msg() . ')'
                );
            }

            return $decoded;
        }

        // Handle non-2xx responses
        $errorMessage = 'AACsearch API returned HTTP ' . $httpCode;

        if (!empty($responseBody)) {
            $decoded = json_decode($responseBody, true);
            if (isset($decoded['error'])) {
                $errorMessage .= ': ' . (is_string($decoded['error'])
                    ? $decoded['error']
                    : json_encode($decoded['error']));
            } elseif (isset($decoded['message'])) {
                $errorMessage .= ': ' . $decoded['message'];
            } else {
                $errorMessage .= ': ' . substr($responseBody, 0, 500);
            }
        }

        throw new AacsearchException($errorMessage);
    }
}
