<?php

namespace Aacsearch;

/**
 * Connector API client for AACsearch CMS sync.
 *
 * Handles authentication via Bearer token (ss_connector_* prefix) and
 * communicates with the AACsearch Connector API for handshake, full sync,
 * delta sync, document deletion, and diagnostics.
 *
 * @since 1.0.0
 */
class ConnectorClient
{
    /** @var string Base URL of the AACsearch Connector API. */
    protected string $apiUrl;

    /** @var string Project identifier. */
    protected string $projectId;

    /** @var string Bearer token (ss_connector_*). */
    protected string $connectorToken;

    /** @var int Default connection timeout in seconds. */
    protected int $timeout;

    /** @var string User-Agent string. */
    protected string $userAgent;

    /**
     * @param string $apiUrl         Base URL of the Connector API.
     * @param string $projectId      AACsearch project ID.
     * @param string $connectorToken ss_connector_* token.
     * @param int    $timeout        Request timeout (default: 30).
     * @param string $userAgent      User-Agent header (optional).
     */
    public function __construct(
        string $apiUrl,
        string $projectId,
        string $connectorToken,
        int $timeout = 30,
        string $userAgent = 'aacsearch-wordpress/1.0.0'
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
     * @param string $platform      Platform identifier.
     *
     * @return bool True if status === 'active'.
     *
     * @throws AacsearchException
     */
    public function handshake(string $moduleVersion = '1.0.0', string $platform = 'wordpress'): bool
    {
        $response = $this->request('POST', '/api/connectors/handshake', [
            'moduleVersion' => $moduleVersion,
            'platform'      => $platform,
        ]);

        return $response !== null && isset($response['status']) && $response['status'] === 'active';
    }

    /**
     * Send a full sync of documents.
     * POST /api/projects/{projectId}/sync/full
     *
     * @param array $documents Array of document arrays.
     *
     * @return bool True if sync succeeded.
     *
     * @throws AacsearchException
     */
    public function fullSync(array $documents): bool
    {
        $response = $this->request(
            'POST',
            '/api/projects/' . urlencode($this->projectId) . '/sync/full',
            ['documents' => $documents]
        );

        return $response !== null && !isset($response['error']);
    }

    /**
     * Send a delta sync of changed documents.
     * POST /api/projects/{projectId}/sync/delta
     *
     * @param array $documents Array of document arrays.
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
            ['documents' => $documents]
        );

        return $response !== null && !isset($response['error']);
    }

    /**
     * Delete a single document by its external ID.
     * DELETE /api/projects/{projectId}/products/{externalId}
     *
     * @param string $externalId The document's external ID.
     *
     * @return bool True if deletion succeeded.
     *
     * @throws AacsearchException
     */
    public function deleteDocument(string $externalId): bool
    {
        $response = $this->request(
            'DELETE',
            '/api/projects/' . urlencode($this->projectId) . '/products/' . urlencode($externalId)
        );

        return $response !== null && !isset($response['error']);
    }

    /**
     * Delete a batch of documents.
     * DELETE /api/connector/documents
     *
     * @param array $externalIds Array of external document IDs.
     *
     * @return int Total deleted.
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
     * Send diagnostics data.
     * POST /api/projects/{projectId}/diagnostics
     *
     * @param array $diagnostics Diagnostic data.
     *
     * @return bool True if accepted.
     *
     * @throws AacsearchException
     */
    public function sendDiagnostics(array $diagnostics = []): bool
    {
        $defaults = [
            'moduleVersion' => '1.0.0',
            'phpVersion'    => PHP_VERSION,
            'siteUrl'       => '',
            'totalDocuments' => 0,
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
     * Check if minimum configuration is present.
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
     * Execute an HTTP request.
     *
     * @param string     $method HTTP method.
     * @param string     $path   API path.
     * @param array|null $body   Request body (optional).
     *
     * @return array|null Decoded response.
     *
     * @throws AacsearchException
     */
    protected function request(string $method, string $path, ?array $body = null): ?array
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
            CURLOPT_TIMEOUT        => $this->timeout,
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
