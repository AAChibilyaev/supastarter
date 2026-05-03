=== AACsearch Search ===
Contributors: aacsearch
Tags: search, instant search, algolia, typesense, full-text search, custom post types
Requires at least: 5.8
Tested up to: 6.7
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPL-2.0+
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Replace native WordPress search with AACsearch instant search. Index posts, pages, CPTs, and taxonomies with real-time sync.

== Description ==

AACsearch Search replaces WordPress's built-in search with a modern, fast, instant-search experience powered by AACsearch Engine.

**Key Features:**

* Instant search results as you type (powered by AACsearch)
* Index posts, pages, custom post types, and taxonomies
* Real-time sync — automatically index on publish/update/delete
* Async indexing via WP-Cron (non-blocking)
* Shortcodes: `[aacsearch_search]` for embedding search
* Full reindex from admin dashboard
* Connection testing and credential verification
* Debug log viewer for troubleshooting
* Multisite compatible

**Document Fields Indexed:**

* Post ID, title, content, excerpt
* Permalink, publication date
* Featured image (thumbnail URL)
* Post type, categories, tags
* Custom fields via `aacsearch_document_fields` filter

== Installation ==

1. Upload the `aacsearch-search` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Go to the 'AACsearch' menu in the WordPress admin.
4. Enter your AACsearch API URL, Search Key (ss_search_*), Connector Key (ss_connector_*), and Index Slug.
5. Select which post types to index and click 'Save Settings'.
6. Click 'Test Connection' to verify your credentials.
7. Click 'Run Full Reindex' to send all content to AACsearch.

== Frequently Asked Questions ==

= What API keys do I need? =

You need two API keys from your AACsearch dashboard:
- **Connector API Key** (`ss_connector_*`) — used for indexing operations
- **Search API Key** (`ss_search_*`) — used by the frontend search widget

= Does it support real-time sync? =

Yes. Enable "Real-time Sync" in the settings to automatically index posts when they are published or updated. Sync runs asynchronously via WP-Cron.

= Can I add custom fields to search results? =

Yes. Use the `aacsearch_document_fields` filter to add custom fields (ACF, meta, etc.) to the document sent to AACsearch.

= Is WooCommerce supported? =

Basic WooCommerce product support is included (products are regular posts with `product` post type). For full WooCommerce product sync with variations, inventory, and price filters, install the AACsearch WooCommerce Addon.

== Screenshots ==

1. AACsearch settings page with API configuration and post type selection.
2. Index status showing document count and last sync time.

== Changelog ==

= 1.0.0 =
* Initial release.
* Admin settings page with API configuration.
* Post indexer with bulk reindex support.
* Real-time sync via WP-Cron.
* Shortcode `[aacsearch_search]` for embedding search.
* Debug log viewer.
* Filter hook `aacsearch_document_fields`.
