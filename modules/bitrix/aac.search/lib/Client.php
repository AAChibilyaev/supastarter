<?php

/**
 * HTTP client for communicating with the AACsearch Connector API.
 *
 * Uses Bitrix curl wrapper (Bitrix\Main\Web\HttpClient).
 * Supported endpoints:
 *  - handshake()
 *  - fullSync(array $products)
 *  - deltaSync(array $products)
 *  - deleteProduct(string $externalId)
 *  - sendDiagnostics(array $data)
 */
namespace AAC\Search;

use Bitrix\Main\Config\Option;
use Bitrix\Main\Web\HttpClient;
use Bitrix\Main\Web\Json;

class Client
{
    private const MODULE_ID = 'aac.search';

    private string $apiUrl;
    private string $projectId;
    private string $token;
    private int    $timeout;

    public function __construct()
    {
        $this->apiUrl    = rtrim(
            (string) Option::get(self::MODULE_ID, 'api_url', ''),
            '/',
        );
        $this->projectId = (string) Option::get(self::MODULE_ID, 'project_id', '');
        $this->token     = (string) Option::get(self::MODULE_ID, 'connector_token', '');
        $this->timeout   = (int) Option::get(self::MODULE_ID, 'request_timeout', 30);
    }

    /**
     * Check whether the client has the minimum configuration.
     */
    public function isConfigured(): bool
    {
        return $this->apiUrl !== '' && $this->token !== '';
    }

    /**
     * POST /connectors/handshake
     *
     * Verifies that the module can talk to the Connector API.
     *
     * @return array{status: string, projectId?: string, indexSlug?: string}|array{error: string}
     */
    public function handshake(): array
    {
        return $this->post('/connectors/handshake', [
            'moduleVersion' => defined('SM_VERSION') ? SM_VERSION : 'unknown',
            'platform'      => 'bitrix',
        ]);
    }

    /**
     * POST /projects/{projectId}/sync/full
     *
     * Sends a batch of up to 1000 normalized products.
     *
     * @param array $products Array of ProductDocument arrays.
     * @return array{status: string, itemsCount?: int}|array{error: string}
     */
    public function fullSync(array $products): array
    {
        return $this->post(
            "/projects/{$this->projectId}/sync/full",
            ['products' => $products],
            120, // longer timeout for full sync
        );
    }

    /**
     * POST /projects/{projectId}/sync/delta
     *
     * Sends a small batch (up to 100) of changed products.
     *
     * @param array $products Array of ProductDocument arrays.
     * @return array{status: string, itemsProcessed?: int}|array{error: string}
     */
    public function deltaSync(array $products): array
    {
        return $this->post(
            "/projects/{$this->projectId}/sync/delta",
            ['products' => $products],
        );
    }

    /**
     * DELETE /projects/{projectId}/products/{externalId}
     *
     * Notifies the API that a product was deleted.
     *
     * @param string $externalId The product ID in Bitrix.
     * @return array{status: string, externalId?: string}|array{error: string}
     */
    public function deleteProduct(string $externalId): array
    {
        return $this->delete(
            "/projects/{$this->projectId}/products/{$externalId}",
        );
    }

    /**
     * POST /projects/{projectId}/diagnostics
     *
     * Sends module health / stats information.
     *
     * @param array $data Additional diagnostic fields.
     * @return array{status: string, receivedAt?: string}|array{error: string}
     */
    public function sendDiagnostics(array $data = []): array
    {
        $defaults = [
            'moduleVersion' => defined('SM_VERSION') ? SM_VERSION : 'unknown',
            'lastFullSync'  => Option::get(self::MODULE_ID, 'last_full_sync', ''),
            'lastDeltaSync' => Option::get(self::MODULE_ID, 'last_delta_sync', ''),
            'totalProducts' => (int) Option::get(self::MODULE_ID, 'total_products', 0),
            'errors'        => [],
            'phpVersion'    => phpversion(),
            'shopUrl'       => $this->getShopUrl(),
        ];

        return $this->post(
            "/projects/{$this->projectId}/diagnostics",
            array_merge($defaults, $data),
        );
    }

    // ─── Internal helpers ─────────────────────────────────────────

    /**
     * Build the auth header value.
     */
    private function authHeader(): string
    {
        return "Bearer {$this->token}";
    }

    /**
     * Perform a POST request.
     */
    private function post(string $path, array $body, int $timeout = null): array
    {
        $http = new HttpClient();
        $http->setTimeout($timeout ?? $this->timeout);
        $http->setStreamTimeout($timeout ?? $this->timeout);
        $http->setHeader('Content-Type', 'application/json');
        $http->setHeader('Authorization', $this->authHeader());

        $url = $this->apiUrl . $path;
        $response = $http->post($url, Json::encode($body));

        return $this->parseResponse($http, $response);
    }

    /**
     * Perform a DELETE request.
     */
    private function delete(string $path): array
    {
        $http = new HttpClient();
        $http->setTimeout($this->timeout);
        $http->setStreamTimeout($this->timeout);
        $http->setHeader('Content-Type', 'application/json');
        $http->setHeader('Authorization', $this->authHeader());

        $url = $this->apiUrl . $path;
        $response = $http->delete($url);

        return $this->parseResponse($http, $response);
    }

    /**
     * Parse the HTTP response into an associative array.
     */
    private function parseResponse(HttpClient $http, ?string $response): array
    {
        $status = $http->getStatus();

        if ($status === 0 || $response === null) {
            return [
                'error' => 'connection_failed',
                'message' => 'Could not reach the API server.',
            ];
        }

        $parsed = Json::decode($response);

        if (!is_array($parsed)) {
            return [
                'error' => 'invalid_response',
                'message' => 'Non-JSON response received.',
            ];
        }

        if ($status >= 400) {
            return array_merge(
                ['error' => 'http_' . $status],
                $parsed,
            );
        }

        return $parsed;
    }

    /**
     * Try to determine the shop public URL.
     */
    private function getShopUrl(): string
    {
        if (!empty($_SERVER['SERVER_NAME'])) {
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'
                ? 'https'
                : 'http';
            return "{$protocol}://{$_SERVER['SERVER_NAME']}";
        }

        if (defined('BX24_HOST_NAME')) {
            return 'https://' . BX24_HOST_NAME;
        }

        return '';
    }
}
