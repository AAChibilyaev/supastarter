<?php

/**
 * Settings page for AAC Search module.
 *
 * @global \CMain $APPLICATION
 */

use Bitrix\Main\Application;
use Bitrix\Main\Config\Option;
use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;

Loc::loadMessages(__FILE__);

require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_admin_before.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_admin_after.php';

$moduleId = 'aac.search';

if (!$APPLICATION->GetGroupRight($moduleId) < 'W') {
    $APPLICATION->AuthForm(Loc::getMessage('ACCESS_DENIED'));
}

Loader::includeModule($moduleId);

$request = Application::getInstance()->getContext()->getRequest();
$activeTab = $request->get('tab') ?: 'connection';

// ─── Save handler ────────────────────────────────────────────────

if ($request->isPost() && $request->get('save') === 'Y' && check_bitrix_sessid()) {
    Option::set($moduleId, 'api_url',        $request->get('api_url'));
    Option::set($moduleId, 'project_id',     $request->get('project_id'));
    Option::set($moduleId, 'connector_token',$request->get('connector_token'));
    Option::set($moduleId, 'request_timeout',(string)(int) $request->get('request_timeout', 30));

    Option::set($moduleId, 'iblock_ids',     $request->get('iblock_ids'));
    Option::set($moduleId, 'price_type',     $request->get('price_type'));
    Option::set($moduleId, 'base_currency',  $request->get('base_currency'));

    Option::set($moduleId, 'sync_interval',  (string)(int) $request->get('sync_interval', 3600));
    Option::set($moduleId, 'sync_mode',      $request->get('sync_mode', 'full'));
    Option::set($moduleId, 'events_enabled', $request->get('events_enabled', 'Y'));

    Option::set($moduleId, 'widget_placement', $request->get('widget_placement', 'auto'));
    Option::set($moduleId, 'widget_theme',     $request->get('widget_theme', 'light'));
    Option::set($moduleId, 'widget_locale',    $request->get('widget_locale', 'en'));

    echo \CAdminMessage::ShowNote(Loc::getMessage('AAC_SEARCH_SAVED') ?: 'Settings saved.');
}

// ─── Build tabs ──────────────────────────────────────────────────

$tabs = [
    'connection' => Loc::getMessage('AAC_SEARCH_TAB_CONNECTION') ?: 'Connection',
    'catalog'    => Loc::getMessage('AAC_SEARCH_TAB_CATALOG')    ?: 'Catalog',
    'sync'       => Loc::getMessage('AAC_SEARCH_TAB_SYNC')       ?: 'Sync',
    'widget'     => Loc::getMessage('AAC_SEARCH_TAB_WIDGET')     ?: 'Widget',
];

// Build iblock / catalog select options
$iblockOptions = '';
if (Loader::includeModule('iblock')) {
    $rsIblocks = \CIBlock::GetList(['SORT' => 'ASC'], ['ACTIVE' => 'Y']);
    while ($iblock = $rsIblocks->Fetch()) {
        $iblockOptions .= '<option value="' . (int) $iblock['ID'] . '"'
            . (in_array((int) $iblock['ID'], getSelectedIblocks(), true) ? ' selected' : '')
            . '>' . htmlspecialcharsbx($iblock['NAME'] . ' [' . $iblock['ID'] . ']') . '</option>';
    }
}

// Build price type options
$priceTypeOptions = '';
if (Loader::includeModule('catalog')) {
    $rsTypes = \CCatalogGroup::GetList(['SORT' => 'ASC']);
    while ($type = $rsTypes->Fetch()) {
        $priceTypeOptions .= '<option value="' . htmlspecialcharsbx($type['NAME']) . '"'
            . (Option::get($moduleId, 'price_type', 'BASE') === $type['NAME'] ? ' selected' : '')
            . '>' . htmlspecialcharsbx($type['NAME'] . ' (' . $type['ID'] . ')') . '</option>';
    }
}

// ─── Tab navigation ──────────────────────────────────────────────

echo '<form method="post">';
echo bitrix_sessid_post();
echo '<input type="hidden" name="save" value="Y">';

echo '<div class="adm-detail-tabs">';
foreach ($tabs as $tabId => $tabTitle) {
    $active = $tabId === $activeTab ? ' class="adm-detail-tab-active"' : '';
    echo '<a href="' . $APPLICATION->GetCurPageParam('tab=' . $tabId, ['tab']) . '"' . $active . '>'
        . htmlspecialcharsbx($tabTitle) . '</a>';
}
echo '</div>';

echo '<div class="adm-detail-content">';

// ─── Tab: Connection ─────────────────────────────────────────────

if ($activeTab === 'connection') {
    ?>
    <table class="adm-detail-content-table" style="width:100%">
        <tr>
            <td style="width:40%"><label><?= Loc::getMessage('AAC_SEARCH_API_URL') ?: 'API URL' ?>:</label></td>
            <td><input type="text" name="api_url" value="<?= htmlspecialcharsbx(Option::get($moduleId, 'api_url', '')) ?>" style="width:400px" placeholder="https://api.example.com/api"></td>
        </tr>
        <tr>
            <td><label><?= Loc::getMessage('AAC_SEARCH_PROJECT_ID') ?: 'Project ID' ?>:</label></td>
            <td><input type="text" name="project_id" value="<?= htmlspecialcharsbx(Option::get($moduleId, 'project_id', '')) ?>" style="width:400px" placeholder="Project / Organization ID"></td>
        </tr>
        <tr>
            <td><label><?= Loc::getMessage('AAC_SEARCH_CONNECTOR_TOKEN') ?: 'Connector Token' ?>:</label></td>
            <td><input type="password" name="connector_token" value="<?= htmlspecialcharsbx(Option::get($moduleId, 'connector_token', '')) ?>" style="width:400px" autocomplete="off"></td>
        </tr>
        <tr>
            <td><label><?= Loc::getMessage('AAC_SEARCH_REQUEST_TIMEOUT') ?: 'Request Timeout (sec)' ?>:</label></td>
            <td><input type="number" name="request_timeout" value="<?= (int) Option::get($moduleId, 'request_timeout', 30) ?>" style="width:100px" min="5" max="300"></td>
        </tr>
    </table>
    <?php
}

// ─── Tab: Catalog ────────────────────────────────────────────────

if ($activeTab === 'catalog') {
    ?>
    <table class="adm-detail-content-table" style="width:100%">
        <tr>
            <td style="width:40%"><label><?= Loc::getMessage('AAC_SEARCH_IBLOCK_IDS') ?: 'Information Blocks (catalogs)' ?>:</label></td>
            <td>
                <select name="iblock_ids" size="8" multiple style="width:400px">
                    <?= $iblockOptions ?>
                </select>
                <br><small>Hold Ctrl/Cmd to select multiple</small>
            </td>
        </tr>
        <tr>
            <td><label><?= Loc::getMessage('AAC_SEARCH_PRICE_TYPE') ?: 'Price Type' ?>:</label></td>
            <td>
                <select name="price_type" style="width:200px">
                    <?= $priceTypeOptions ?>
                </select>
            </td>
        </tr>
        <tr>
            <td><label><?= Loc::getMessage('AAC_SEARCH_BASE_CURRENCY') ?: 'Base Currency' ?>:</label></td>
            <td><input type="text" name="base_currency" value="<?= htmlspecialcharsbx(Option::get($moduleId, 'base_currency', 'USD')) ?>" style="width:100px" placeholder="USD"></td>
        </tr>
    </table>
    <?php
}

// ─── Tab: Sync ───────────────────────────────────────────────────

if ($activeTab === 'sync') {
    $currentInterval = (int) Option::get($moduleId, 'sync_interval', 3600);
    ?>
    <table class="adm-detail-content-table" style="width:100%">
        <tr>
            <td style="width:40%"><label><?= Loc::getMessage('AAC_SEARCH_SYNC_INTERVAL') ?: 'Sync Interval (seconds)' ?>:</label></td>
            <td>
                <input type="number" name="sync_interval" value="<?= $currentInterval ?>" style="width:100px" min="60" step="60">
                <br><small>Default: 3600 (1 hour). Minimum: 60.</small>
            </td>
        </tr>
        <tr>
            <td><label><?= Loc::getMessage('AAC_SEARCH_SYNC_MODE') ?: 'Sync Mode' ?>:</label></td>
            <td>
                <select name="sync_mode">
                    <option value="full" <?= Option::get($moduleId, 'sync_mode', 'full') === 'full' ? 'selected' : '' ?>><?= Loc::getMessage('AAC_SEARCH_SYNC_MODE_FULL') ?: 'Full sync' ?></option>
                    <option value="delta" <?= Option::get($moduleId, 'sync_mode', 'full') === 'delta' ? 'selected' : '' ?>><?= Loc::getMessage('AAC_SEARCH_SYNC_MODE_DELTA') ?: 'Delta sync only' ?></option>
                </select>
            </td>
        </tr>
        <tr>
            <td><label><?= Loc::getMessage('AAC_SEARCH_EVENTS_ENABLED') ?: 'Real-time events (delta sync)' ?>:</label></td>
            <td>
                <input type="checkbox" name="events_enabled" value="Y" <?= Option::get($moduleId, 'events_enabled', 'Y') === 'Y' ? 'checked' : '' ?>>
            </td>
        </tr>
    </table>
    <?php
}

// ─── Tab: Widget ─────────────────────────────────────────────────

if ($activeTab === 'widget') {
    ?>
    <table class="adm-detail-content-table" style="width:100%">
        <tr>
            <td style="width:40%"><label><?= Loc::getMessage('AAC_SEARCH_WIDGET_PLACEMENT') ?: 'Widget Placement' ?>:</label></td>
            <td>
                <select name="widget_placement">
                    <option value="auto" <?= Option::get($moduleId, 'widget_placement', 'auto') === 'auto' ? 'selected' : '' ?>><?= Loc::getMessage('AAC_SEARCH_WIDGET_AUTO') ?: 'Automatic (append to page)' ?></option>
                    <option value="manual" <?= Option::get($moduleId, 'widget_placement', 'auto') === 'manual' ? 'selected' : '' ?>><?= Loc::getMessage('AAC_SEARCH_WIDGET_MANUAL') ?: 'Manual (via API)' ?></option>
                    <option value="inline" <?= Option::get($moduleId, 'widget_placement', 'auto') === 'inline' ? 'selected' : '' ?>><?= Loc::getMessage('AAC_SEARCH_WIDGET_INLINE') ?: 'Inline component' ?></option>
                </select>
            </td>
        </tr>
        <tr>
            <td><label><?= Loc::getMessage('AAC_SEARCH_WIDGET_THEME') ?: 'Widget Theme' ?>:</label></td>
            <td>
                <select name="widget_theme">
                    <option value="light" <?= Option::get($moduleId, 'widget_theme', 'light') === 'light' ? 'selected' : '' ?>><?= Loc::getMessage('AAC_SEARCH_WIDGET_THEME_LIGHT') ?: 'Light' ?></option>
                    <option value="dark" <?= Option::get($moduleId, 'widget_theme', 'light') === 'dark' ? 'selected' : '' ?>><?= Loc::getMessage('AAC_SEARCH_WIDGET_THEME_DARK') ?: 'Dark' ?></option>
                </select>
            </td>
        </tr>
        <tr>
            <td><label><?= Loc::getMessage('AAC_SEARCH_WIDGET_LOCALE') ?: 'Widget Locale' ?>:</label></td>
            <td>
                <select name="widget_locale">
                    <option value="en" <?= Option::get($moduleId, 'widget_locale', 'en') === 'en' ? 'selected' : '' ?>>English</option>
                    <option value="ru" <?= Option::get($moduleId, 'widget_locale', 'en') === 'ru' ? 'selected' : '' ?>>Русский</option>
                    <option value="de" <?= Option::get($moduleId, 'widget_locale', 'en') === 'de' ? 'selected' : '' ?>>Deutsch</option>
                    <option value="fr" <?= Option::get($moduleId, 'widget_locale', 'en') === 'fr' ? 'selected' : '' ?>>Français</option>
                    <option value="es" <?= Option::get($moduleId, 'widget_locale', 'en') === 'es' ? 'selected' : '' ?>>Español</option>
                </select>
            </td>
        </tr>
        <tr>
            <td><label><?= Loc::getMessage('AAC_SEARCH_WIDGET_CODE_SAMPLE') ?: 'Component call' ?>:</label></td>
            <td>
                <code style="display:block; padding:8px; background:#f5f5f5; border:1px solid #ccc; margin-top:4px;">
                    &lt;?php \$APPLICATION-&gt;IncludeComponent('aac:search.widget', '', []); ?&gt;
                </code>
            </td>
        </tr>
    </table>
    <?php
}

echo '</div>'; // .adm-detail-content

// ─── Save button ─────────────────────────────────────────────────

echo '<input type="submit" value="' . (Loc::getMessage('AAC_SEARCH_SAVE') ?: 'Save Settings') . '" class="adm-btn-save">';
echo '</form>';

require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/epilog_admin.php';

/**
 * Helper to get currently selected iblock IDs as an array.
 */
function getSelectedIblocks(): array
{
    return array_filter(
        array_map('intval', explode(',', Option::get('aac.search', 'iblock_ids', ''))),
    );
}
