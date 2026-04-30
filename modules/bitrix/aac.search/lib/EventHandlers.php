<?php

/**
 * Iblock event handlers for AAC Search module.
 *
 * Listens to:
 *  - OnAfterIBlockElementAdd
 *  - OnAfterIBlockElementUpdate
 *  - OnAfterIBlockElementDelete
 *
 * On changes, performs a delta-sync or notifies the Connector API
 * about the individual product change.
 */
namespace AAC\Search;

use Bitrix\Main\Config\Option;
use Bitrix\Main\Loader;

class EventHandlers
{
    private const MODULE_ID = 'aac.search';

    /**
     * Handle new iblock element creation.
     *
     * @param array &$fields Element fields.
     */
    public static function onAfterIBlockElementAdd(array &$fields): void
    {
        if (!self::isEnabled()) {
            return;
        }

        $iblockId = (int) ($fields['IBLOCK_ID'] ?? 0);
        if (!self::isTrackedIblock($iblockId)) {
            return;
        }

        $elementId = (int) ($fields['ID'] ?? 0);
        if ($elementId <= 0) {
            return;
        }

        self::deltaSyncElement($elementId);
    }

    /**
     * Handle iblock element update.
     *
     * @param array &$fields Element fields.
     */
    public static function onAfterIBlockElementUpdate(array &$fields): void
    {
        if (!self::isEnabled()) {
            return;
        }

        $iblockId = (int) ($fields['IBLOCK_ID'] ?? 0);
        if (!self::isTrackedIblock($iblockId)) {
            return;
        }

        $elementId = (int) ($fields['ID'] ?? 0);
        if ($elementId <= 0) {
            return;
        }

        self::deltaSyncElement($elementId);
    }

    /**
     * Handle iblock element deletion.
     *
     * @param array &$fields Element fields (usually contains ID).
     */
    public static function onAfterIBlockElementDelete(array &$fields): void
    {
        if (!self::isEnabled()) {
            return;
        }

        $elementId = (int) ($fields['ID'] ?? 0);
        if ($elementId <= 0) {
            return;
        }

        $client = new Client();
        if (!$client->isConfigured()) {
            return;
        }

        $result = $client->deleteProduct((string) $elementId);

        if (!isset($result['error'])) {
            Option::set(self::MODULE_ID, 'last_delta_sync', (string) time());
        }
    }

    // ─── Internal helpers ─────────────────────────────────────────

    /**
     * Check whether delta-sync event handlers are enabled.
     */
    private static function isEnabled(): bool
    {
        return Option::get(self::MODULE_ID, 'events_enabled', 'Y') === 'Y';
    }

    /**
     * Check whether the given iblock ID is one of the configured catalogs.
     */
    private static function isTrackedIblock(int $iblockId): bool
    {
        $idsRaw = Option::get(self::MODULE_ID, 'iblock_ids', '');
        $ids = array_filter(array_map('intval', explode(',', $idsRaw)));

        return in_array($iblockId, $ids, true);
    }

    /**
     * Perform a delta-sync for a single product element.
     */
    private static function deltaSyncElement(int $elementId): void
    {
        $client = new Client();
        if (!$client->isConfigured()) {
            return;
        }

        $exporter = new ProductExporter();
        $product = $exporter->exportOne($elementId);

        if ($product === null) {
            return;
        }

        $result = $client->deltaSync([$product]);

        if (!isset($result['error'])) {
            Option::set(self::MODULE_ID, 'last_delta_sync', (string) time());
        }
    }
}
