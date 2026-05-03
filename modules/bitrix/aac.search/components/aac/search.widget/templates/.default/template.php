<?php

/**
 * AAC Search Widget Component
 *
 * Renders the search widget on the public-facing site.
 * Supports three placement modes: auto, manual, inline.
 */

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) {
    die();
}

use Bitrix\Main\Config\Option;
use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;

$moduleId = 'aac.search';

if (!Loader::includeModule($moduleId)) {
    ShowError(Loc::getMessage('AAC_SEARCH_MODULE_NOT_INSTALLED') ?: 'AAC Search module not installed.');
    return;
}

// ─── Component parameters ────────────────────────────────────────

$widgetPlacement = Option::get($moduleId, 'widget_placement', 'auto');
$widgetTheme     = Option::get($moduleId, 'widget_theme', 'light');
$widgetLocale    = Option::get($moduleId, 'widget_locale', 'en');
$apiUrl          = Option::get($moduleId, 'api_url', '');
$projectId       = Option::get($moduleId, 'project_id', '');
$indexSlug       = Option::get($moduleId, 'index_slug', '');

// Allow override via component params
$widgetPlacement = $arParams['WIDGET_PLACEMENT'] ?? $widgetPlacement;
$widgetTheme     = $arParams['WIDGET_THEME']     ?? $widgetTheme;
$widgetLocale    = $arParams['WIDGET_LOCALE']    ?? $widgetLocale;

// ─── Render ──────────────────────────────────────────────────────

if ($widgetPlacement === 'inline') {
    // Render an inline search form
    ?>
    <div class="aac-search-widget aac-search-widget--inline" data-theme="<?= htmlspecialcharsbx($widgetTheme) ?>">
        <form class="aac-search-widget__form" action="" method="get" role="search">
            <input
                type="search"
                class="aac-search-widget__input"
                name="q"
                placeholder="<?= Loc::getMessage('AAC_SEARCH_WIDGET_PLACEHOLDER') ?: 'Search...' ?>"
                autocomplete="off"
            >
            <button type="submit" class="aac-search-widget__button">
                <?= Loc::getMessage('AAC_SEARCH_WIDGET_SEARCH') ?: 'Search' ?>
            </button>
        </form>
        <div class="aac-search-widget__results"></div>
    </div>

    <script>
    (function() {
        var widget = document.querySelector('.aac-search-widget--inline');
        if (!widget) return;

        var form    = widget.querySelector('.aac-search-widget__form');
        var input   = widget.querySelector('.aac-search-widget__input');
        var results = widget.querySelector('.aac-search-widget__results');

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var query = input.value.trim();
            if (!query) return;

            results.innerHTML = 'Searching...';

            // Use fetch to proxy through the server-side AJAX handler
            fetch('/bitrix/admin/aac_search_ajax.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: query,
                    projectId: '<?= CUtil::JSEscape($projectId) ?>',
                    indexSlug: '<?= CUtil::JSEscape($indexSlug) ?>'
                })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.items && data.items.length) {
                    var html = '<ul class="aac-search-widget__list">';
                    data.items.forEach(function(item) {
                        html += '<li><a href="' + item.url + '">' + item.title + '</a></li>';
                    });
                    html += '</ul>';
                    results.innerHTML = html;
                } else {
                    results.innerHTML = 'No results found.';
                }
            })
            .catch(function() {
                results.innerHTML = 'Search failed.';
            });
        });
    })();
    </script>
    <?php
} elseif ($widgetPlacement === 'auto') {
    // Render a script that will auto-append the widget to the page
    ?>
    <div id="aac-search-widget-root" data-theme="<?= htmlspecialcharsbx($widgetTheme) ?>" data-locale="<?= htmlspecialcharsbx($widgetLocale) ?>"></div>
    <script>
    (function() {
        // Auto-initialize widget (placeholder for future SDK loader)
        var root = document.getElementById('aac-search-widget-root');
        if (root) {
            root.innerHTML = '<div style="text-align:center;padding:16px;color:#888">AAC Search Widget (auto mode)</div>';
        }
    })();
    </script>
    <?php
} else {
    // Manual mode — no HTML, just expose JS API
    ?>
    <script>
    window.aacSearchWidget = window.aacSearchWidget || {
        config: {
            theme: '<?= CUtil::JSEscape($widgetTheme) ?>',
            locale: '<?= CUtil::JSEscape($widgetLocale) ?>',
            apiUrl: '<?= CUtil::JSEscape($apiUrl) ?>',
            projectId: '<?= CUtil::JSEscape($projectId) ?>',
            indexSlug: '<?= CUtil::JSEscape($indexSlug) ?>'
        },
        init: function() { /* SDK initialization placeholder */ },
        search: function(query) { /* search placeholder */ }
    };
    </script>
    <?php
}
