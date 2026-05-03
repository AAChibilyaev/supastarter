{**
 * AACsearch Widget Template
 *
 * Injected via hookDisplayHeader when widget is enabled.
 * Provides instant search with autocomplete results.
 * Replaces default PrestaShop search functionality.
 *
 * @author    AACsearch
 * @copyright 2026 AACsearch
 *}
{if isset($aacsearch_widget_enabled) && $aacsearch_widget_enabled}
<div id="aacsearch-widget" class="aacsearch-widget" data-project-id="{$aacsearch_project_id|escape:'htmlall':'UTF-8'}" data-api-url="{$aacsearch_api_url|escape:'htmlall':'UTF-8'}" data-locale="{$aacsearch_locale|escape:'htmlall':'UTF-8'}">
    <form class="aacsearch-widget__form" action="{$aacsearch_search_url|default:{url entity='module' name='aacsearch' controller='search'}|escape:'htmlall':'UTF-8'}" method="get" role="search">
        <div class="aacsearch-widget__input-group">
            <input
                type="search"
                class="aacsearch-widget__input form-control"
                name="s"
                id="aacsearch-widget-input"
                placeholder="{l s='Search products...' mod='aacsearch'}"
                autocomplete="off"
                aria-label="{l s='Search' mod='aacsearch'}"
            >
            <button type="submit" class="aacsearch-widget__button btn btn-primary" aria-label="{l s='Submit search' mod='aacsearch'}">
                <i class="material-icons">&#xE8B6;</i>
            </button>
        </div>
        <div class="aacsearch-widget__suggestions" id="aacsearch-suggestions" style="display:none;"></div>
    </form>
</div>

<script>
(function() {
    var widget = document.getElementById('aacsearch-widget');
    if (!widget) return;

    var input = widget.querySelector('.aacsearch-widget__input');
    var suggestions = widget.getElementById('aacsearch-suggestions');
    var apiUrl = widget.getAttribute('data-api-url');
    var projectId = widget.getAttribute('data-project-id');
    var locale = widget.getAttribute('data-locale');
    var debounceTimer = null;

    // Auto-suggestions on input
    input.addEventListener('input', function(e) {
        var query = e.target.value.trim();
        if (query.length < 2) {
            suggestions.style.display = 'none';
            return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
            fetch(apiUrl + '/api/projects/' + encodeURIComponent(projectId) + '/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ q: query, limit: 5, offset: 0 })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var items = data.items || data.result || [];
                if (items.length === 0) {
                    suggestions.style.display = 'none';
                    return;
                }

                var html = '<ul class="aacsearch-widget__list">';
                items.forEach(function(item) {
                    var url = item.product_url || item.url || '#';
                    var title = item.title || '';
                    var price = item.price ? item.price.toFixed(2) + ' ' + (item.currency || 'USD') : '';
                    var image = item.image_url ? '<img src="' + item.image_url + '" alt="" class="aacsearch-widget__thumb">' : '';

                    html += '<li class="aacsearch-widget__item">';
                    html += '<a href="' + url + '">';
                    if (image) html += image;
                    html += '<div class="aacsearch-widget__info">';
                    html += '<span class="aacsearch-widget__title">' + title + '</span>';
                    if (price) html += '<span class="aacsearch-widget__price">' + price + '</span>';
                    html += '</div></a></li>';
                });
                html += '</ul>';
                suggestions.innerHTML = html;
                suggestions.style.display = 'block';
            })
            .catch(function() {
                suggestions.style.display = 'none';
            });
        }, 300);
    });

    // Hide suggestions on blur
    input.addEventListener('blur', function() {
        setTimeout(function() { suggestions.style.display = 'none'; }, 200);
    });

    // Show suggestions on focus if there's a query
    input.addEventListener('focus', function() {
        if (input.value.trim().length >= 2) {
            suggestions.style.display = 'block';
        }
    });
})();
</script>

<style>
.aacsearch-widget { position: relative; max-width: 500px; }
.aacsearch-widget__input-group { display: flex; align-items: stretch; }
.aacsearch-widget__input { flex: 1; }
.aacsearch-widget__button { display: flex; align-items: center; justify-content: center; }
.aacsearch-widget__suggestions {
    position: absolute; top: 100%; left: 0; right: 0; z-index: 1000;
    background: #fff; border: 1px solid #ddd; border-top: none;
    max-height: 400px; overflow-y: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
.aacsearch-widget__list { list-style: none; margin: 0; padding: 0; }
.aacsearch-widget__item { border-bottom: 1px solid #eee; }
.aacsearch-widget__item:last-child { border-bottom: none; }
.aacsearch-widget__item a {
    display: flex; align-items: center; padding: 8px 12px; text-decoration: none; color: #333;
}
.aacsearch-widget__item a:hover { background: #f5f5f5; }
.aacsearch-widget__thumb { width: 40px; height: 40px; object-fit: cover; margin-right: 10px; border-radius: 4px; }
.aacsearch-widget__info { flex: 1; }
.aacsearch-widget__title { display: block; font-size: 14px; font-weight: 600; }
.aacsearch-widget__price { display: block; font-size: 12px; color: #2fb5d2; margin-top: 2px; }
</style>
{/if}
