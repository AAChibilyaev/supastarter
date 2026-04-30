<?php

/**
 * Diagnostics page for AAC Search module.
 *
 * Shows:
 *  - API connection status (via handshake)
 *  - Last sync timestamps
 *  - Product count
 *  - Sync log history
 *  - Errors
 *
 * @global \CMain $APPLICATION
 */

use Bitrix\Main\Application;
use Bitrix\Main\Config\Option;
use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;

require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_admin_before.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_admin_after.php';

$moduleId = 'aac.search';

if (!$APPLICATION->GetGroupRight($moduleId) >= 'W') {
    $APPLICATION->AuthForm(Loc::getMessage('ACCESS_DENIED'));
}

Loader::includeModule($moduleId);

$request = Application::getInstance()->getContext()->getRequest();
$action  = $request->get('action');

// ─── Run handshake test ─────────────────────────────────────────

$handshakeResult = null;
if ($action === 'test_connection' && check_bitrix_sessid()) {
    $client = new \AAC\Search\Client();
    $handshakeResult = $client->handshake();
}

// ─── Fetch statistics ───────────────────────────────────────────

$db = Application::getConnection();

// Last sync log entries
$syncLogs = [];
$rsSync = $db->query(
    "SELECT * FROM b_aac_search_sync_log ORDER BY ID DESC LIMIT 20"
);
while ($row = $rsSync->fetch()) {
    $syncLogs[] = $row;
}

// Recent errors
$errors = [];
$rsErr = $db->query(
    "SELECT e.*, l.SYNC_TYPE as SYNC_LOG_TYPE
     FROM b_aac_search_sync_error e
     LEFT JOIN b_aac_search_sync_log l ON e.SYNC_LOG_ID = l.ID
     ORDER BY e.ID DESC LIMIT 20"
);
while ($row = $rsErr->fetch()) {
    $errors[] = $row;
}

// Option-based stats
$apiUrl         = Option::get($moduleId, 'api_url', '');
$projectId      = Option::get($moduleId, 'project_id', '');
$tokenSet       = Option::get($moduleId, 'connector_token', '') !== '' ? 'Yes' : 'No';
$lastFullSync   = Option::get($moduleId, 'last_full_sync', '');
$lastDeltaSync  = Option::get($moduleId, 'last_delta_sync', '');
$totalProducts  = (int) Option::get($moduleId, 'total_products', 0);
$lastError      = Option::get($moduleId, 'last_sync_error', '');

// Format timestamps
$lastFullSyncStr  = $lastFullSync  ? date('Y-m-d H:i:s', (int) $lastFullSync)  : 'Never';
$lastDeltaSyncStr = $lastDeltaSync ? date('Y-m-d H:i:s', (int) $lastDeltaSync) : 'Never';
$lastErrorStr     = $lastError     ? date('Y-m-d H:i:s', (int) $lastError)     : 'None';

// ─── Page header ─────────────────────────────────────────────────

$APPLICATION->SetTitle(Loc::getMessage('AAC_SEARCH_DIAGNOSTICS_TITLE') ?: 'AAC Search — Diagnostics');

echo '<h2>' . (Loc::getMessage('AAC_SEARCH_DIAGNOSTICS_TITLE') ?: 'Diagnostics') . '</h2>';

// ─── Handshake test results ──────────────────────────────────────

if ($handshakeResult !== null) {
    if (!isset($handshakeResult['error'])) {
        echo \CAdminMessage::ShowNote(
            Loc::getMessage('AAC_SEARCH_CONNECTION_OK')
                ?: 'Connection successful! Status: ' . ($handshakeResult['status'] ?? 'ok')
        );
    } else {
        echo \CAdminMessage::ShowMessage([
            'MESSAGE' => Loc::getMessage('AAC_SEARCH_CONNECTION_FAILED') ?: 'Connection failed',
            'DETAILS' => $handshakeResult['message'] ?? $handshakeResult['error'],
            'TYPE'    => 'ERROR',
        ]);
    }
}

// ─── Configuration status ────────────────────────────────────────

echo '<h3>' . (Loc::getMessage('AAC_SEARCH_CONFIG_STATUS') ?: 'Configuration Status') . '</h3>';
echo '<table class="adm-detail-content-table" style="width:100%">';
echo '<tr><td style="width:30%">API URL:</td><td>' . htmlspecialcharsbx($apiUrl ?: 'Not set') . '</td></tr>';
echo '<tr><td>Project ID:</td><td>' . htmlspecialcharsbx($projectId ?: 'Not set') . '</td></tr>';
echo '<tr><td>Connector Token:</td><td>' . $tokenSet . '</td></tr>';
echo '<tr><td>Module Version:</td><td>' . htmlspecialcharsbx(defined('SM_VERSION') ? SM_VERSION : 'N/A') . '</td></tr>';
echo '<tr><td>PHP Version:</td><td>' . phpversion() . '</td></tr>';
echo '</table>';

echo '<br>';

// ─── Sync status ─────────────────────────────────────────────────

echo '<h3>' . (Loc::getMessage('AAC_SEARCH_SYNC_STATUS') ?: 'Sync Status') . '</h3>';
echo '<table class="adm-detail-content-table" style="width:100%">';
echo '<tr><td style="width:30%">' . (Loc::getMessage('AAC_SEARCH_LAST_FULL_SYNC') ?: 'Last Full Sync') . ':</td><td>' . $lastFullSyncStr . '</td></tr>';
echo '<tr><td>' . (Loc::getMessage('AAC_SEARCH_LAST_DELTA_SYNC') ?: 'Last Delta Sync') . ':</td><td>' . $lastDeltaSyncStr . '</td></tr>';
echo '<tr><td>' . (Loc::getMessage('AAC_SEARCH_TOTAL_PRODUCTS') ?: 'Total Products') . ':</td><td>' . $totalProducts . '</td></tr>';
echo '<tr><td>' . (Loc::getMessage('AAC_SEARCH_LAST_ERROR') ?: 'Last Error') . ':</td><td>' . $lastErrorStr . '</td></tr>';
echo '</table>';

echo '<br>';

// ─── Test connection button ──────────────────────────────────────

echo '<form method="post">';
echo bitrix_sessid_post();
echo '<input type="hidden" name="action" value="test_connection">';
echo '<input type="submit" value="' . (Loc::getMessage('AAC_SEARCH_TEST_CONNECTION') ?: 'Test Connection') . '" class="adm-btn">';
echo '</form>';

echo '<br>';

// ─── Sync log history ────────────────────────────────────────────

echo '<h3>' . (Loc::getMessage('AAC_SEARCH_SYNC_LOG') ?: 'Sync Log (last 20)') . '</h3>';
echo '<table class="adm-detail-content-table" style="width:100%">';
echo '<tr>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_ID') ?: 'ID') . '</th>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_TYPE') ?: 'Type') . '</th>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_STATUS') ?: 'Status') . '</th>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_STARTED') ?: 'Started') . '</th>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_FINISHED') ?: 'Finished') . '</th>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_PRODUCTS') ?: 'Products') . '</th>
</tr>';

if (empty($syncLogs)) {
    echo '<tr><td colspan="6">' . (Loc::getMessage('AAC_SEARCH_NO_LOGS') ?: 'No sync logs yet.') . '</td></tr>';
} else {
    foreach ($syncLogs as $log) {
        $statusClass = match ($log['STATUS']) {
            'success' => 'adm-l-green',
            'partial' => 'adm-l-yellow',
            'running' => 'adm-l-blue',
            default   => 'adm-l-red',
        };
        echo '<tr>
            <td>' . (int) $log['ID'] . '</td>
            <td>' . htmlspecialcharsbx($log['SYNC_TYPE']) . '</td>
            <td class="' . $statusClass . '">' . htmlspecialcharsbx($log['STATUS']) . '</td>
            <td>' . htmlspecialcharsbx($log['STARTED_AT'] ?? '-') . '</td>
            <td>' . htmlspecialcharsbx($log['FINISHED_AT'] ?? '-') . '</td>
            <td>' . (int) $log['PRODUCTS_COUNT'] . '</td>
        </tr>';
    }
}
echo '</table>';

echo '<br>';

// ─── Error log ───────────────────────────────────────────────────

echo '<h3>' . (Loc::getMessage('AAC_SEARCH_ERROR_LOG') ?: 'Errors (last 20)') . '</h3>';
echo '<table class="adm-detail-content-table" style="width:100%">';
echo '<tr>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_ID') ?: 'ID') . '</th>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_SYNC_TYPE') ?: 'Sync') . '</th>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_PRODUCT_ID') ?: 'Product') . '</th>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_ERROR_CODE') ?: 'Code') . '</th>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_ERROR_MSG') ?: 'Message') . '</th>
    <th>' . (Loc::getMessage('AAC_SEARCH_LOG_TIMESTAMP') ?: 'Time') . '</th>
</tr>';

if (empty($errors)) {
    echo '<tr><td colspan="6">' . (Loc::getMessage('AAC_SEARCH_NO_ERRORS') ?: 'No errors recorded.') . '</td></tr>';
} else {
    foreach ($errors as $err) {
        echo '<tr>
            <td>' . (int) $err['ID'] . '</td>
            <td>' . htmlspecialcharsbx($err['SYNC_LOG_TYPE'] ?? '-') . '</td>
            <td>' . ((int) $err['PRODUCT_ID'] > 0 ? (int) $err['PRODUCT_ID'] : '-') . '</td>
            <td>' . htmlspecialcharsbx($err['ERROR_CODE']) . '</td>
            <td>' . htmlspecialcharsbx(mb_substr($err['ERROR_MESSAGE'], 0, 200)) . '</td>
            <td>' . htmlspecialcharsbx($err['CREATED_AT']) . '</td>
        </tr>';
    }
}
echo '</table>';

require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/epilog_admin.php';
