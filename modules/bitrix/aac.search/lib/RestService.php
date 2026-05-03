<?php

/**
 * Bitrix24 REST API service for AACsearch.
 *
 * Registers REST API endpoints for:
 *  - aacsearch.search — proxy search requests to AACsearch
 *  - aacsearch.order.search — search CRM orders via AACsearch
 *  - aacsearch.sync.status — check sync status
 *  - aacsearch.sync.trigger — trigger a manual full re-sync
 *
 * Attach via OnRestServiceBuildHandler event in install/index.php.
 */
namespace AAC\Search;

use Bitrix\Main\Config\Option;
use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;

Loc::loadMessages(__FILE__);

class RestService
{
    private const MODULE_ID = 'aac.search';

    /**
     * Register REST API endpoint descriptions for Bitrix24 marketplace.
     *
     * Hook: OnRestServiceBuildHandler
     *
     * @param array $handlers Existing REST handlers.
     * @return array Modified handlers with AACsearch endpoints.
     */
    public static function onRestServiceBuildHandler(array $handlers): array
    {
        $handlers['aacsearch'] = [
            'search'          => [static::class, 'search'],
            'order.search'    => [static::class, 'orderSearch'],
            'sync.status'     => [static::class, 'syncStatus'],
            'sync.trigger'    => [static::class, 'syncTrigger'],
        ];

        return $handlers;
    }

    /**
     * REST: aacsearch.search
     *
     * Proxy search requests to the AACsearch Connector API.
     *
     * @param array $query Query parameters.
     * @param int   $n     Navigation offset.
     * @param array $order Sort order.
     *
     * @return array{result: array, total?: int}|array{error: string}
     */
    public static function search(array $query, int $n = 0, array $order = []): array
    {
        $client = new Client();
        if (!$client->isConfigured()) {
            return ['error' => 'Client is not configured. Visit module settings to configure.'];
        }

        $q = $query['q'] ?? '';
        if (empty($q)) {
            return ['result' => [], 'total' => 0];
        }

        try {
            // Use the connector client to perform a search via the API
            $result = self::performSearch($q, $query);
            return $result;
        } catch (\Throwable $e) {
            return ['error' => 'Search failed: ' . $e->getMessage()];
        }
    }

    /**
     * REST: aacsearch.order.search
     *
     * Search CRM orders via the AACsearch indexed data.
     * Uses the Connector API search endpoint with order-specific filters.
     *
     * @param array $query Search parameters.
     * @return array{result: array, total?: int}|array{error: string}
     */
    public static function orderSearch(array $query): array
    {
        if (!Loader::includeModule('crm')) {
            return ['error' => 'CRM module is not installed.'];
        }

        $client = new Client();
        if (!$client->isConfigured()) {
            return ['error' => 'Client is not configured.'];
        }

        $q = $query['q'] ?? '';
        if (empty($q)) {
            // Return recent orders if no query
            return self::getRecentOrders($query['limit'] ?? 10);
        }

        try {
            $result = self::performSearch($q, [
                'q'           => $q,
                'searchFields' => ['title', 'description', 'sku', 'attributes.order_id'],
                'limit'       => (int) ($query['limit'] ?? 20),
                'offset'      => (int) ($query['offset'] ?? 0),
            ]);
            return $result;
        } catch (\Throwable $e) {
            return ['error' => 'Order search failed: ' . $e->getMessage()];
        }
    }

    /**
     * REST: aacsearch.sync.status
     *
     * Get current synchronization status.
     *
     * @return array{configured: bool, lastFullSync: string, lastDeltaSync: string, totalProducts: int, lastError: string}
     */
    public static function syncStatus(): array
    {
        $lastFullSync   = Option::get(self::MODULE_ID, 'last_full_sync', '');
        $lastDeltaSync  = Option::get(self::MODULE_ID, 'last_delta_sync', '');
        $totalProducts  = (int) Option::get(self::MODULE_ID, 'total_products', 0);
        $lastError      = Option::get(self::MODULE_ID, 'last_sync_error', '');
        $tokenSet       = Option::get(self::MODULE_ID, 'connector_token', '') !== '';

        return [
            'configured'    => $tokenSet,
            'lastFullSync'  => $lastFullSync ? date('c', (int) $lastFullSync) : '',
            'lastDeltaSync' => $lastDeltaSync ? date('c', (int) $lastDeltaSync) : '',
            'totalProducts' => $totalProducts,
            'lastError'     => $lastError ? date('c', (int) $lastError) : '',
        ];
    }

    /**
     * REST: aacsearch.sync.trigger
     *
     * Trigger a manual full re-synchronization.
     * Runs synchronously if count is small, defers to agent otherwise.
     *
     * @param array $params Trigger parameters.
     * @return array{status: string, message: string, productsCount?: int}
     */
    public static function syncTrigger(array $params = []): array
    {
        $client = new Client();
        if (!$client->isConfigured()) {
            return ['status' => 'error', 'message' => 'Client is not configured.'];
        }

        $exporter = new ProductExporter();
        $allProducts = $exporter->exportAll();

        if (empty($allProducts)) {
            Option::set(self::MODULE_ID, 'last_full_sync', (string) time());
            return ['status' => 'ok', 'message' => 'No products to sync.', 'productsCount' => 0];
        }

        // For small counts (< 100), sync synchronously
        if (count($allProducts) < 100) {
            $chunks = array_chunk($allProducts, 1000);
            $allOk = true;
            foreach ($chunks as $batch) {
                $result = $client->fullSync($batch);
                if (isset($result['error'])) {
                    $allOk = false;
                }
            }

            Option::set(self::MODULE_ID, 'last_full_sync', (string) time());
            Option::set(self::MODULE_ID, 'total_products', (string) count($allProducts));

            return [
                'status'        => $allOk ? 'ok' : 'partial',
                'message'       => $allOk
                    ? 'Synced ' . count($allProducts) . ' products.'
                    : 'Partial sync with errors.',
                'productsCount' => count($allProducts),
            ];
        }

        // For large catalogs, rely on the agent
        Option::set(self::MODULE_ID, 'total_products', (string) count($allProducts));
        \CAgent::RemoveModuleAgents(self::MODULE_ID);
        \CAgent::AddAgent(
            \AAC\Search\SyncAgent::getAgentName(),
            self::MODULE_ID,
            'N',
            (int) Option::get(self::MODULE_ID, 'sync_interval', 3600),
            '',
            'Y',
            date('Y-m-d H:i:s', time() + 10), // start in 10 seconds
            100,
        );

        return [
            'status'        => 'queued',
            'message'       => 'Full sync queued for ' . count($allProducts) . ' products via agent.',
            'productsCount' => count($allProducts),
        ];
    }

    // ─── Internal helpers ─────────────────────────────────────────

    /**
     * Perform a search via the Connector API.
     *
     * @param string $q     Search query.
     * @param array  $query Additional search parameters.
     * @return array{result: array, total: int}
     */
    private static function performSearch(string $q, array $query = []): array
    {
        $apiUrl    = rtrim((string) Option::get(self::MODULE_ID, 'api_url', ''), '/');
        $projectId = (string) Option::get(self::MODULE_ID, 'project_id', '');
        $token     = (string) Option::get(self::MODULE_ID, 'connector_token', '');

        if (empty($apiUrl) || empty($projectId) || empty($token)) {
            return ['result' => [], 'total' => 0];
        }

        $limit  = (int) ($query['limit'] ?? 10);
        $offset = (int) ($query['offset'] ?? 0);

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $apiUrl . '/api/projects/' . urlencode($projectId) . '/search',
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
                'Accept: application/json',
                'User-Agent: AACsearch-Bitrix/1.0.0',
            ],
            CURLOPT_POSTFIELDS     => json_encode([
                'q'     => $q,
                'limit' => $limit,
                'offset'=> $offset,
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $responseBody = curl_exec($ch);
        $httpCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError    = curl_error($ch);
        curl_close($ch);

        if (!empty($curlError)) {
            return ['result' => [], 'total' => 0];
        }

        if ($httpCode >= 200 && $httpCode < 300 && !empty($responseBody)) {
            $decoded = json_decode($responseBody, true);
            if (is_array($decoded)) {
                return [
                    'result' => $decoded['items'] ?? $decoded['result'] ?? [],
                    'total'  => $decoded['total'] ?? count($decoded['items'] ?? []),
                ];
            }
        }

        return ['result' => [], 'total' => 0];
    }

    /**
     * Get recent CRM orders.
     *
     * @param int $limit Max orders to return.
     * @return array{result: array, total: int}
     */
    private static function getRecentOrders(int $limit = 10): array
    {
        if (!Loader::includeModule('crm')) {
            return ['result' => [], 'total' => 0];
        }

        $orders = [];
        $dbOrder = \CCrmOrder::GetList(
            ['DATE_INSERT' => 'DESC'],
            [],
            false,
            ['nTopCount' => $limit],
            ['ID', 'ORDER_TOPIC', 'PRICE', 'CURRENCY', 'STATUS_ID', 'DATE_INSERT']
        );

        while ($order = $dbOrder->Fetch()) {
            $orders[] = [
                'id'    => (int) $order['ID'],
                'title' => $order['ORDER_TOPIC'] ?? 'Order #' . $order['ID'],
                'price' => (float) $order['PRICE'],
                'currency' => $order['CURRENCY'] ?? 'USD',
                'status' => $order['STATUS_ID'] ?? '',
                'date'  => $order['DATE_INSERT'] ?? '',
            ];
        }

        // Also search CCrmDeal as orders (for compatibility with older Bitrix CRM)
        if (empty($orders)) {
            $dbDeal = \CCrmDeal::GetListEx(
                ['DATE_CREATE' => 'DESC'],
                [],
                false,
                ['nTopCount' => $limit],
                ['ID', 'TITLE', 'OPPORTUNITY', 'CURRENCY_ID', 'STAGE_ID', 'DATE_CREATE']
            );

            while ($deal = $dbDeal->Fetch()) {
                $orders[] = [
                    'id'    => (int) $deal['ID'],
                    'title' => $deal['TITLE'] ?? 'Deal #' . $deal['ID'],
                    'price' => (float) ($deal['OPPORTUNITY'] ?? 0),
                    'currency' => $deal['CURRENCY_ID'] ?? 'USD',
                    'status' => $deal['STAGE_ID'] ?? '',
                    'date'  => $deal['DATE_CREATE'] ?? '',
                ];
            }
        }

        return ['result' => $orders, 'total' => count($orders)];
    }
}
