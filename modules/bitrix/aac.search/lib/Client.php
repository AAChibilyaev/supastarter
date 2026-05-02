<?php

/**
 * HTTP client for communicating with the AACsearch Connector API.
 *
 * Adapter around Aacsearch\ConnectorClient from the aacsearch-php SDK.
 * Reads configuration from Bitrix module options and returns arrays
 * (not booleans) to match Bitrix's existing caller expectations.
 *
 * Supported endpoints:
 *  - handshake()
 *  - fullSync(array $products)
 *  - deltaSync(array $products)
 *  - deleteProduct(string $externalId)
 *  - batchDelete(array $externalIds)
 *  - sendDiagnostics(array $data)
 */
namespace AAC\Search;

use Aacsearch\ConnectorClient;
use Aacsearch\AacsearchException;

// Load the aacsearch-php SDK (Bitrix does not use Composer autoload)
require_once __DIR__ . '/../lib/aacsearch/ConnectorClient.php';
require_once __DIR__ . '/../lib/aacsearch/Exceptions.php';

use Bitrix\Main\Config\Option;

class Client
{
    private const MODULE_ID = 'aac.search';

    /**
     * Underlying SDK ConnectorClient instance.
     *
     * @var ConnectorClient|null
     */
    private ?ConnectorClient $connector = null;

    /**
     * Construct and configure from module options.
     */
    public function __construct()
    {
        $apiUrl         = rtrim((string) Option::get(self::MODULE_ID, 'api_url', ''), '/');
        $projectId      = (string) Option::get(self::MODULE_ID, 'project_id', '');
        $token          = (string) Option::get(self::MODULE_ID, 'connector_token', '');
        $timeout        = (int) Option::get(self::MODULE_ID, 'request_timeout', 30);

        if ($apiUrl !== '' && $token !== '') {
            $this->connector = new ConnectorClient(
                $apiUrl,
                $projectId,
                $token,
                $timeout,
                'AACsearch-Bitrix/1.0.0'
            );
        }
    }

    /**
     * Check whether the client has the minimum configuration.
     */
    public function isConfigured(): bool
    {
        return $this->connector !== null && $this->connector->isConfigured();
    }

    /**
     * POST /connectors/handshake
     *
     * Verifies that the module can talk to the Connector API.
     *
     * @return array{status: string, projectId?: string, indexSlug?: string}|array{error: string, message?: string}
     */
    public function handshake(): array
    {
        if (!$this->isConfigured()) {
            return ['error' => 'not_configured', 'message' => 'Client is not configured.'];
        }

        try {
            $moduleVersion = defined('SM_VERSION') ? SM_VERSION : 'unknown';
            $success = $this->connector->handshake($moduleVersion, 'bitrix');
            return $success
                ? ['status' => 'active']
                : ['error' => 'handshake_failed', 'message' => 'Handshake returned non-active status.'];
        } catch (AacsearchException $e) {
            return ['error' => 'handshake_failed', 'message' => $e->getMessage()];
        }
    }

    /**
     * POST /projects/{projectId}/sync/full
     *
     * Sends a batch of up to 1000 normalized products.
     *
     * @param array $products Array of ProductDocument arrays.
     * @return array{status: string, itemsCount?: int}|array{error: string, message?: string}
     */
    public function fullSync(array $products): array
    {
        if (!$this->isConfigured()) {
            return ['error' => 'not_configured', 'message' => 'Client is not configured.'];
        }

        try {
            $success = $this->connector->fullSync($products, 120);
            return $success
                ? ['status' => 'ok', 'itemsCount' => count($products)]
                : ['error' => 'sync_failed', 'message' => 'Full sync request returned an error.'];
        } catch (AacsearchException $e) {
            return ['error' => 'sync_failed', 'message' => $e->getMessage()];
        }
    }

    /**
     * POST /projects/{projectId}/sync/delta
     *
     * Sends a small batch (up to 100) of changed products.
     *
     * @param array $products Array of ProductDocument arrays.
     * @return array{status: string, itemsProcessed?: int}|array{error: string, message?: string}
     */
    public function deltaSync(array $products): array
    {
        if (!$this->isConfigured()) {
            return ['error' => 'not_configured', 'message' => 'Client is not configured.'];
        }

        try {
            $success = $this->connector->deltaSync($products);
            return $success
                ? ['status' => 'ok', 'itemsProcessed' => count($products)]
                : ['error' => 'sync_failed', 'message' => 'Delta sync request returned an error.'];
        } catch (AacsearchException $e) {
            return ['error' => 'sync_failed', 'message' => $e->getMessage()];
        }
    }

    /**
     * DELETE /projects/{projectId}/products/{externalId}
     *
     * Notifies the API that a product was deleted.
     *
     * @param string $externalId The product ID in Bitrix.
     * @return array{status: string, externalId?: string}|array{error: string, message?: string}
     */
    public function deleteProduct(string $externalId): array
    {
        if (!$this->isConfigured()) {
            return ['error' => 'not_configured', 'message' => 'Client is not configured.'];
        }

        try {
            $success = $this->connector->deleteProduct($externalId);
            return $success
                ? ['status' => 'ok', 'externalId' => $externalId]
                : ['error' => 'delete_failed', 'message' => 'Delete request returned an error.'];
        } catch (AacsearchException $e) {
            return ['error' => 'delete_failed', 'message' => $e->getMessage()];
        }
    }

    /**
     * DELETE /connector/documents (batch, relative to apiUrl which already includes /api)
     *
     * Enqueues up to 500 external IDs per request for deletion.
     * Automatically chunks larger arrays.
     *
     * @param array $externalIds External product IDs to delete.
     * @return array{deleted: int}|array{error: string, message?: string}
     */
    public function batchDelete(array $externalIds): array
    {
        if (empty($externalIds)) {
            return ['deleted' => 0];
        }

        if (!$this->isConfigured()) {
            return ['error' => 'not_configured', 'message' => 'Client is not configured.'];
        }

        try {
            $total = $this->connector->batchDelete($externalIds);
            return ['deleted' => $total];
        } catch (AacsearchException $e) {
            return ['error' => 'delete_failed', 'message' => $e->getMessage()];
        }
    }

    /**
     * POST /projects/{projectId}/diagnostics
     *
     * Sends module health / stats information.
     *
     * @param array $data Additional diagnostic fields.
     * @return array{status: string, receivedAt?: string}|array{error: string, message?: string}
     */
    public function sendDiagnostics(array $data = []): array
    {
        if (!$this->isConfigured()) {
            return ['error' => 'not_configured', 'message' => 'Client is not configured.'];
        }

        $defaults = [
            'moduleVersion' => defined('SM_VERSION') ? SM_VERSION : 'unknown',
            'lastFullSync'  => Option::get(self::MODULE_ID, 'last_full_sync', ''),
            'lastDeltaSync' => Option::get(self::MODULE_ID, 'last_delta_sync', ''),
            'totalProducts' => (int) Option::get(self::MODULE_ID, 'total_products', 0),
            'errors'        => [],
            'phpVersion'    => PHP_VERSION,
            'shopUrl'       => $this->getShopUrl(),
        ];

        try {
            $success = $this->connector->sendDiagnostics(array_merge($defaults, $data));
            return $success
                ? ['status' => 'ok']
                : ['error' => 'diagnostics_failed', 'message' => 'Diagnostics request returned an error.'];
        } catch (AacsearchException $e) {
            return ['error' => 'diagnostics_failed', 'message' => $e->getMessage()];
        }
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
