<?php
/**
 * AACsearch - PrestaShop 8.x Connector Module
 *
 * HTTP client that communicates with the AACsearch Connector API.
 * Handles authentication via Bearer token and provides methods for
 * handshake, full sync, delta sync, product deletion, and diagnostics.
 *
 * @author    AACsearch
 * @copyright 2026 AACsearch
 * @license   MIT
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class AacSearchClient
{
    /**
     * Base URL of the AACsearch Connector API.
     *
     * @var string
     */
    protected $apiUrl;

    /**
     * Project identifier.
     *
     * @var string
     */
    protected $projectId;

    /**
     * Bearer token for API authentication (ss_connector_*).
     *
     * @var string
     */
    protected $connectorToken;

    /**
     * Default connection timeout in seconds.
     */
    const TIMEOUT = 30;

    /**
     * @param string $apiUrl         Base URL of the Connector API
     * @param string $projectId      AACsearch project ID
     * @param string $connectorToken ss_connector_* token
     */
    public function __construct($apiUrl, $projectId, $connectorToken)
    {
        $this->apiUrl = rtrim($apiUrl, '/');
        $this->projectId = $projectId;
        $this->connectorToken = $connectorToken;
    }

    /**
     * Perform a handshake with the AACsearch Connector API.
     * POST /api/connectors/handshake
     *
     * @return bool True if handshake succeeded
     *
     * @throws Exception
     */
    public function handshake()
    {
        $response = $this->request('POST', '/api/connectors/handshake', [
            'project_id' => $this->projectId,
        ]);

        return $response !== null && isset($response['success']) && $response['success'] === true;
    }

    /**
     * Send a full sync of all products.
     * POST /api/projects/{projectId}/sync/full
     *
     * @param array $products Array of ProductDocument arrays
     *
     * @return bool True if sync succeeded
     *
     * @throws Exception
     */
    public function fullSync(array $products)
    {
        $response = $this->request(
            'POST',
            '/api/projects/' . urlencode($this->projectId) . '/sync/full',
            [
                'products' => $products,
            ]
        );

        return $response !== null && !isset($response['error']);
    }

    /**
     * Send a delta sync of changed products.
     * POST /api/projects/{projectId}/sync/delta
     *
     * @param array $products Array of ProductDocument arrays
     *
     * @return bool True if sync succeeded
     *
     * @throws Exception
     */
    public function deltaSync(array $products)
    {
        $response = $this->request(
            'POST',
            '/api/projects/' . urlencode($this->projectId) . '/sync/delta',
            [
                'products' => $products,
            ]
        );

        return $response !== null && !isset($response['error']);
    }

    /**
     * Delete a product from AACsearch by its external ID.
     * DELETE /api/projects/{projectId}/products/{externalId}
     *
     * @param string $externalId The product's external ID
     *
     * @return bool True if deletion succeeded
     *
     * @throws Exception
     */
    public function deleteProduct($externalId)
    {
        $response = $this->request(
            'DELETE',
            '/api/projects/' . urlencode($this->projectId) . '/products/' . urlencode($externalId)
        );

        return $response !== null && !isset($response['error']);
    }

    /**
     * Delete a batch of products from AACsearch.
     * DELETE /api/connector/documents
     *
     * Accepts up to 500 IDs per API call; larger arrays are automatically
     * split into 500-item chunks.
     *
     * @param array $externalIds Array of external product IDs to delete
     *
     * @return int Total number of deleted documents
     *
     * @throws Exception
     */
    public function batchDelete(array $externalIds)
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
     * @param array $diagnostics Associative array of diagnostic data
     *
     * @return bool True if diagnostics were accepted
     *
     * @throws Exception
     */
    public function sendDiagnostics(array $diagnostics)
    {
        $response = $this->request(
            'POST',
            '/api/projects/' . urlencode($this->projectId) . '/diagnostics',
            $diagnostics
        );

        return $response !== null && !isset($response['error']);
    }

    /**
     * Execute an HTTP request against the AACsearch API.
     *
     * @param string $method  HTTP method (GET, POST, DELETE, etc.)
     * @param string $path    API path (e.g., /api/connectors/handshake)
     * @param array  $body    Request body payload (optional)
     *
     * @return array|null Decoded response array, or null on failure
     *
     * @throws Exception
     */
    protected function request($method, $path, array $body = [])
    {
        $url = $this->apiUrl . $path;

        $headers = [
            'Authorization: Bearer ' . $this->connectorToken,
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: AACsearch-PrestaShop/1.0.0',
        ];

        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => self::TIMEOUT,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false,
        ]);

        if (!empty($body) && in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $responseBody = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        $curlErrno = curl_errno($ch);

        curl_close($ch);

        if ($curlErrno !== 0) {
            throw new Exception(
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
                throw new Exception(
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

        throw new Exception($errorMessage);
    }

    /**
     * Validate that the client has the minimum required configuration.
     *
     * @return bool
     */
    public function isConfigured()
    {
        return !empty($this->apiUrl)
            && !empty($this->projectId)
            && !empty($this->connectorToken);
    }
}
