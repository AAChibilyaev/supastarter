<?php

/**
 * Bitrix options handler (options.php).
 *
 * Redirects to the module's dedicated settings page or shows
 * a compact settings form in the module list context.
 */

use Bitrix\Main\Config\Option;
use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;

$moduleId = 'aac.search';

Loader::includeModule($moduleId);

// ─── Global options array ────────────────────────────────────────

global $APPLICATION;

$aTabs = [
    [
        'DIV'   => 'aac_search_connection',
        'TAB'   => Loc::getMessage('AAC_SEARCH_TAB_CONNECTION') ?: 'Connection',
        'TITLE' => Loc::getMessage('AAC_SEARCH_TAB_CONNECTION_TITLE') ?: 'AACsearch API Connection Settings',
        'OPTIONS' => [
            [
                'api_url',
                Loc::getMessage('AAC_SEARCH_API_URL') ?: 'API URL',
                '',
                ['text', 50],
            ],
            [
                'project_id',
                Loc::getMessage('AAC_SEARCH_PROJECT_ID') ?: 'Project ID',
                '',
                ['text', 50],
            ],
            [
                'connector_token',
                Loc::getMessage('AAC_SEARCH_CONNECTOR_TOKEN') ?: 'Connector Token',
                '',
                ['password', 50],
            ],
            [
                'request_timeout',
                Loc::getMessage('AAC_SEARCH_REQUEST_TIMEOUT') ?: 'Request Timeout (sec)',
                '30',
                ['text', 5],
            ],
        ],
    ],
    [
        'DIV'   => 'aac_search_catalog',
        'TAB'   => Loc::getMessage('AAC_SEARCH_TAB_CATALOG') ?: 'Catalog',
        'TITLE' => Loc::getMessage('AAC_SEARCH_TAB_CATALOG_TITLE') ?: 'Catalog Selection Settings',
        'OPTIONS' => [
            [
                'iblock_ids',
                Loc::getMessage('AAC_SEARCH_IBLOCK_IDS') ?: 'Information Block IDs (comma-separated)',
                '',
                ['text', 50],
            ],
            [
                'price_type',
                Loc::getMessage('AAC_SEARCH_PRICE_TYPE') ?: 'Price Type',
                'BASE',
                ['text', 20],
            ],
            [
                'base_currency',
                Loc::getMessage('AAC_SEARCH_BASE_CURRENCY') ?: 'Base Currency',
                'USD',
                ['text', 5],
            ],
        ],
    ],
    [
        'DIV'   => 'aac_search_sync',
        'TAB'   => Loc::getMessage('AAC_SEARCH_TAB_SYNC') ?: 'Sync',
        'TITLE' => Loc::getMessage('AAC_SEARCH_TAB_SYNC_TITLE') ?: 'Synchronization Settings',
        'OPTIONS' => [
            [
                'sync_interval',
                Loc::getMessage('AAC_SEARCH_SYNC_INTERVAL') ?: 'Sync Interval (seconds)',
                '3600',
                ['text', 10],
            ],
            [
                'sync_mode',
                Loc::getMessage('AAC_SEARCH_SYNC_MODE') ?: 'Sync Mode',
                'full',
                ['selectbox', [
                    'full'  => Loc::getMessage('AAC_SEARCH_SYNC_MODE_FULL') ?: 'Full sync',
                    'delta' => Loc::getMessage('AAC_SEARCH_SYNC_MODE_DELTA') ?: 'Delta sync only',
                ]],
            ],
            [
                'events_enabled',
                Loc::getMessage('AAC_SEARCH_EVENTS_ENABLED') ?: 'Real-time events (delta sync)',
                'Y',
                ['checkbox'],
            ],
        ],
    ],
    [
        'DIV'   => 'aac_search_widget',
        'TAB'   => Loc::getMessage('AAC_SEARCH_TAB_WIDGET') ?: 'Widget',
        'TITLE' => Loc::getMessage('AAC_SEARCH_TAB_WIDGET_TITLE') ?: 'Search Widget Settings',
        'OPTIONS' => [
            [
                'widget_placement',
                Loc::getMessage('AAC_SEARCH_WIDGET_PLACEMENT') ?: 'Widget Placement',
                'auto',
                ['selectbox', [
                    'auto'   => Loc::getMessage('AAC_SEARCH_WIDGET_AUTO') ?: 'Automatic',
                    'manual' => Loc::getMessage('AAC_SEARCH_WIDGET_MANUAL') ?: 'Manual',
                    'inline' => Loc::getMessage('AAC_SEARCH_WIDGET_INLINE') ?: 'Inline component',
                ]],
            ],
            [
                'widget_theme',
                Loc::getMessage('AAC_SEARCH_WIDGET_THEME') ?: 'Widget Theme',
                'light',
                ['selectbox', [
                    'light' => Loc::getMessage('AAC_SEARCH_WIDGET_THEME_LIGHT') ?: 'Light',
                    'dark'  => Loc::getMessage('AAC_SEARCH_WIDGET_THEME_DARK') ?: 'Dark',
                ]],
            ],
            [
                'widget_locale',
                Loc::getMessage('AAC_SEARCH_WIDGET_LOCALE') ?: 'Widget Locale',
                'en',
                ['selectbox', [
                    'en' => 'English',
                    'ru' => 'Русский',
                    'de' => 'Deutsch',
                    'fr' => 'Français',
                    'es' => 'Español',
                ]],
            ],
        ],
    ],
];

// ─── Save & display handler ──────────────────────────────────────

if ($APPLICATION->GetGroupRight($moduleId) >= 'W') {
    // Handle POST save from the admin module list options form
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['save']) && check_bitrix_sessid()) {
        foreach ($aTabs as $tab) {
            foreach ($tab['OPTIONS'] as $opt) {
                $name = $opt[0];
                if (isset($_REQUEST[$name])) {
                    Option::set($moduleId, $name, is_array($_REQUEST[$name])
                        ? implode(',', $_REQUEST[$name])
                        : (string) $_REQUEST[$name]
                    );
                } elseif ($opt[3][0] === 'checkbox') {
                    // Unchecked checkbox — clear value
                    Option::set($moduleId, $name, 'N');
                }
            }
        }

        // Update agent interval if changed
        $interval = (int) Option::get($moduleId, 'sync_interval', 3600);
        \CAgent::RemoveModuleAgents($moduleId);
        \CAgent::AddAgent(
            \AAC\Search\SyncAgent::getAgentName(),
            $moduleId,
            'N',
            $interval,
            '',
            'Y',
            '',
            100,
        );
    }
}

// ─── Render tabs ─────────────────────────────────────────────────

foreach ($aTabs as $tab) {
    $tabControl = new \CAdminTabControl($tab['DIV'], [$tab]);
    $tabControl->Begin();
    ?>
    <form method="post" action="<?= $APPLICATION->GetCurPage() ?>?mid=<?= htmlspecialcharsbx($moduleId) ?>&lang=<?= LANGUAGE_ID ?>">
        <?= bitrix_sessid_post() ?>
        <input type="hidden" name="save" value="Y">

        <table class="adm-detail-content-table" style="width:100%">
            <?php foreach ($tab['OPTIONS'] as $opt): ?>
                <?php
                $name     = $opt[0];
                $label    = $opt[1];
                $default  = $opt[2];
                $type     = $opt[3];
                $value    = Option::get($moduleId, $name, $default);
                ?>
                <tr>
                    <td style="width:40%">
                        <label for="<?= htmlspecialcharsbx($name) ?>"><?= htmlspecialcharsbx($label) ?>:</label>
                    </td>
                    <td>
                        <?php if ($type[0] === 'text'): ?>
                            <input
                                type="text"
                                name="<?= htmlspecialcharsbx($name) ?>"
                                id="<?= htmlspecialcharsbx($name) ?>"
                                value="<?= htmlspecialcharsbx($value) ?>"
                                size="<?= (int) ($type[1] ?? 30) ?>"
                            >
                        <?php elseif ($type[0] === 'password'): ?>
                            <input
                                type="password"
                                name="<?= htmlspecialcharsbx($name) ?>"
                                id="<?= htmlspecialcharsbx($name) ?>"
                                value="<?= htmlspecialcharsbx($value) ?>"
                                size="<?= (int) ($type[1] ?? 30) ?>"
                                autocomplete="off"
                            >
                        <?php elseif ($type[0] === 'checkbox'): ?>
                            <input
                                type="checkbox"
                                name="<?= htmlspecialcharsbx($name) ?>"
                                id="<?= htmlspecialcharsbx($name) ?>"
                                value="Y"
                                <?= $value === 'Y' ? 'checked' : '' ?>
                            >
                        <?php elseif ($type[0] === 'selectbox'): ?>
                            <select name="<?= htmlspecialcharsbx($name) ?>" id="<?= htmlspecialcharsbx($name) ?>">
                                <?php foreach ($type[1] as $optVal => $optLabel): ?>
                                    <option value="<?= htmlspecialcharsbx($optVal) ?>" <?= $value === $optVal ? 'selected' : '' ?>>
                                        <?= htmlspecialcharsbx($optLabel) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </table>

        <br>
        <input type="submit" value="<?= Loc::getMessage('MAIN_SAVE') ?: 'Save' ?>" class="adm-btn-save">
    </form>
    <?php
    $tabControl->End();
}
