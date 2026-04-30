<?php
/**
 * AACsearch - PrestaShop 8.x Connector Module
 *
 * Batch state tracking for product synchronization operations.
 * Maintains a queue table to track which batches have been processed,
 * their status, and any error information.
 *
 * @author    AACsearch
 * @copyright 2026 AACsearch
 * @license   MIT
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class AacSearchSyncQueue
{
    /**
     * Database table name.
     */
    const TABLE_NAME = 'aacsearch_sync_queue';

    /**
     * Batch status constants.
     */
    const STATUS_PENDING  = 'pending';
    const STATUS_RUNNING  = 'running';
    const STATUS_COMPLETE = 'complete';
    const STATUS_FAILED   = 'failed';

    /**
     * Initialize the sync queue database table.
     *
     * @return bool
     */
    public static function installTable()
    {
        $sql = 'CREATE TABLE IF NOT EXISTS `' . _DB_PREFIX_ . self::TABLE_NAME . '` (
            `id_queue` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `batch_index` INT UNSIGNED NOT NULL,
            `product_count` INT UNSIGNED NOT NULL DEFAULT 0,
            `status` VARCHAR(20) NOT NULL DEFAULT "' . self::STATUS_PENDING . '",
            `error_message` TEXT NULL,
            `started_at` DATETIME NULL,
            `completed_at` DATETIME NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_batch_index` (`batch_index`),
            INDEX `idx_status` (`status`)
        ) ENGINE=' . _MYSQL_ENGINE_ . ' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;';

        return Db::getInstance()->execute($sql);
    }

    /**
     * Remove the sync queue database table.
     *
     * @return bool
     */
    public static function uninstallTable()
    {
        return Db::getInstance()->execute(
            'DROP TABLE IF EXISTS `' . _DB_PREFIX_ . self::TABLE_NAME . '`'
        );
    }

    /**
     * Create a new batch entry with pending status.
     *
     * @param int $batchIndex Zero-based batch index
     * @param int $productCount Number of products in this batch
     *
     * @return int Insert ID
     */
    public function startBatch($batchIndex, $productCount)
    {
        $data = [
            'batch_index' => (int) $batchIndex,
            'product_count' => (int) $productCount,
            'status' => self::STATUS_RUNNING,
            'started_at' => date('Y-m-d H:i:s'),
        ];

        $result = Db::getInstance()->insert(self::TABLE_NAME, $data);

        return $result ? (int) Db::getInstance()->Insert_ID() : 0;
    }

    /**
     * Mark a batch as complete.
     *
     * @param int $batchIndex Zero-based batch index
     *
     * @return bool
     */
    public function completeBatch($batchIndex)
    {
        return Db::getInstance()->update(
            self::TABLE_NAME,
            [
                'status' => self::STATUS_COMPLETE,
                'completed_at' => date('Y-m-d H:i:s'),
            ],
            'batch_index = ' . (int) $batchIndex . ' AND status = "' . self::STATUS_RUNNING . '"'
        );
    }

    /**
     * Mark a batch as failed with an error message.
     *
     * @param int    $batchIndex Zero-based batch index
     * @param string $errorMessage Description of the failure
     *
     * @return bool
     */
    public function failBatch($batchIndex, $errorMessage)
    {
        return Db::getInstance()->update(
            self::TABLE_NAME,
            [
                'status' => self::STATUS_FAILED,
                'error_message' => pSQL($errorMessage),
                'completed_at' => date('Y-m-d H:i:s'),
            ],
            'batch_index = ' . (int) $batchIndex . ' AND status = "' . self::STATUS_RUNNING . '"'
        );
    }

    /**
     * Get the current status of a batch.
     *
     * @param int $batchIndex
     *
     * @return array|null Batch row or null if not found
     */
    public function getBatchStatus($batchIndex)
    {
        $sql = new DbQuery();
        $sql->select('*');
        $sql->from(self::TABLE_NAME);
        $sql->where('batch_index = ' . (int) $batchIndex);
        $sql->orderBy('id_queue DESC');

        return Db::getInstance()->getRow($sql);
    }

    /**
     * Get all batches for the latest sync operation.
     *
     * @return array
     */
    public function getAllBatches()
    {
        $sql = new DbQuery();
        $sql->select('*');
        $sql->from(self::TABLE_NAME);
        $sql->orderBy('batch_index ASC');

        return Db::getInstance()->executeS($sql);
    }

    /**
     * Get a summary of the latest sync operation.
     *
     * @return array
     */
    public function getSyncSummary()
    {
        $sql = new DbQuery();
        $sql->select(
            'COUNT(*) AS total_batches, '
            . 'SUM(IF(status = "' . self::STATUS_COMPLETE . '", 1, 0)) AS completed_batches, '
            . 'SUM(IF(status = "' . self::STATUS_FAILED . '", 1, 0)) AS failed_batches, '
            . 'SUM(IF(status = "' . self::STATUS_PENDING . '", 1, 0)) AS pending_batches, '
            . 'SUM(product_count) AS total_products'
        );
        $sql->from(self::TABLE_NAME);

        return Db::getInstance()->getRow($sql);
    }

    /**
     * Clean up old queue records, keeping only the most recent entries.
     *
     * @param int $keepCount Number of most recent records to keep
     *
     * @return bool
     */
    public function cleanOldRecords($keepCount = 100)
    {
        $sql = 'DELETE FROM `' . _DB_PREFIX_ . self::TABLE_NAME . '`
                WHERE id_queue NOT IN (
                    SELECT id_queue FROM (
                        SELECT id_queue FROM `' . _DB_PREFIX_ . self::TABLE_NAME . '`
                        ORDER BY id_queue DESC
                        LIMIT ' . (int) $keepCount . '
                    ) AS keep_ids
                )';

        return Db::getInstance()->execute($sql);
    }

    /**
     * Clear all queue records.
     *
     * @return bool
     */
    public function clearAll()
    {
        return Db::getInstance()->execute(
            'TRUNCATE TABLE `' . _DB_PREFIX_ . self::TABLE_NAME . '`'
        );
    }
}
