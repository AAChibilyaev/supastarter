{*
 * AACsearch - PrestaShop 8.x Connector Module
 *
 * Widget injection template — renders on displayHeader hook.
 * Injects the AACsearch widget container and initialization script.
 *
 * @author    AACsearch
 * @copyright 2026 AACsearch
 * @license   MIT
 *}

{if isset($aacsearch_widget_enabled) && $aacsearch_widget_enabled}
<div id="aacsearch-widget-container"
     data-project-id="{$aacsearch_project_id|escape:'htmlall':'UTF-8'}"
     data-api-url="{$aacsearch_api_url|escape:'htmlall':'UTF-8'}"
     data-locale="{$aacsearch_locale|escape:'htmlall':'UTF-8'}"
     data-currency="{$aacsearch_currency|escape:'htmlall':'UTF-8'}"
     style="display: none;">
</div>

<script type="text/javascript">
(function() {
    'use strict';

    var container = document.getElementById('aacsearch-widget-container');
    if (!container) {
        return;
    }

    var projectId = container.getAttribute('data-project-id');
    var apiUrl = container.getAttribute('data-api-url');
    var locale = container.getAttribute('data-locale') || 'en';
    var currency = container.getAttribute('data-currency') || 'USD';

    if (!projectId || !apiUrl) {
        console.warn('[AACsearch] Missing required widget configuration.');
        return;
    }

    // Provide config globally for the AACsearch widget script
    window.AACSEARCH = window.AACSEARCH || {};
    window.AACSEARCH.config = {
        projectId: projectId,
        apiUrl: apiUrl,
        locale: locale,
        currency: currency
    };

    container.style.display = '';
    container.setAttribute('data-ready', 'true');
})();
</script>
{/if}
