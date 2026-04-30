<?php

/**
 * Bitrix agent for periodic full-sync with the AACsearch Connector API.
 *
 * The agent is registered during module installation via CAgent::AddAgent.
 * Run the sync using the configured client and exporter.
 */
namespace AAC\Search;

use Bitrix\Main\Config\Option;
use Bitrix\Main\Type\DateTime;

class SyncAgent
{
    private const MODULE_ID = 'aac.search';

    /**
     * Return the agent method name for CAgent registration.
     *
     * Example:
     *   CAgent::AddAgent(\AAC\Search\SyncAgent::getAgentName(), ...);
     *
     * @return string
     */
    public static function getAgentName(): string
    {
        return '\\' . static::class . '::run();';
    }

    /**
     * Execute a full synchronization.
     *
     * Called by the Bitrix agent system on a cron-like schedule.
     * - Loads all products via ProductExporter
     * - Sends them in chunks of up to 1000 via Client::fullSync()
     * - Records sync log entries
     * - Returns the agent method name to keep the agent active,
     *   or an empty string to stop the agent on persistent failure.
     *
     * @return string
     */
    public static function run(): string
    {
        $client = new Client();

        if (!$client->isConfigured()) {
            return static::getAgentName();
        }

        $exporter = new ProductExporter();
        $allProducts = $exporter->exportAll();

        if (empty($allProducts)) {
            // Nothing to sync — keep agent alive
            Option::set(self::MODULE_ID, 'last_full_sync', (string) time());
            Option::set(self::MODULE_ID, 'total_products', '0');
            return static::getAgentName();
        }

        // Record total before syncing
        Option::set(self::MODULE_ID, 'total_products', (string) count($allProducts));

        $logId = self::startSyncLog('full', count($allProducts));

        // Chunk into batches of 1000 (API limit)
        $chunks = array_chunk($allProducts, 1000);
        $allOk = true;

        foreach ($chunks as $i => $batch) {
            $result = $client->fullSync($batch);

            if (isset($result['error'])) {
                $allOk = false;
                self::logError($logId, 0, $result['error'], $result['message'] ?? '');
            }
        }

        // Update sync log
        $status = $allOk ? 'success' : 'partial';
        self::finishSyncLog($logId, $status);

        Option::set(self::MODULE_ID, 'last_full_sync', (string) time());

        if (!$allOk) {
            // Log failure but keep the agent alive for retry
            Option::set(self::MODULE_ID, 'last_sync_error', (string) time());
        }

        return static::getAgentName();
    }

    /**
     * Start a sync log entry.
     */
    private static function startSyncLog(string $type, int $count): int
    {
        $result = \Bitrix\Main\Application::getConnection()->query(
            "INSERT INTO b_aac_search_sync_log (SYNC_TYPE, STATUS, STARTED_AT, PRODUCTS_COUNT)
             VALUES ('" . \Bitrix\Main\Application::getConnection()->getSqlHelper()->forSql($type) . "', 'running', NOW(), " . (int) $count . ")"
        );

        return (int) \Bitrix\Main\Application::getConnection()->getInsertedId();
    }

    /**
     * Complete a sync log entry.
     */
    private static function finishSyncLog(int $logId, string $status): void
    {
        \Bitrix\Main\Application::getConnection()->query(
            "UPDATE b_aac_search_sync_log
             SET STATUS = '" . \Bitrix\Main\Application::getConnection()->getSqlHelper()->forSql($status) . "',
                 FINISHED_AT = NOW()
             WHERE ID = " . (int) $logId
        );
    }

    /**
     * Log an individual sync error.
     */
    private static function logError(int $logId, int $productId, string $code, string $message): void
    {
        \Bitrix\Main\Application::getConnection()->query(
            "INSERT INTO b_aac_search_sync_error (SYNC_LOG_ID, PRODUCT_ID, ERROR_CODE, ERROR_MESSAGE)
             VALUES (" . (int) $logId . ", " . (int) $productId . ", '"
                . \Bitrix\Main\Application::getConnection()->getSqlHelper()->forSql($code) . "', '"
                . \Bitrix\Main\Application::getConnection()->getSqlHelper()->forSql($message) . "')"
        );
    }
}
