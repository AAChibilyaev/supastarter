=== AACsearch Search ===
Contributors: aacsearch
Tags: search, instant-search, woocommerce, aacsearch, autocomplete
Requires at least: 5.8
Tested up to: 6.8
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPL-2.0+
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Replace native WordPress search with AACsearch instant search. Real-time indexing, Elementor/Gutenberg widgets, WooCommerce support.

== Description ==

AACsearch Search replaces WordPress's built-in search with a modern, fast, instant-search experience powered by AACsearch Engine — a hosted search-as-a-service platform. Results appear as you type, with autocomplete suggestions, highlighted matches, and faceted filtering.

**Key Features:**

* **Instant search results** — live search as you type with autocomplete and highlighted matches
* **Universal content indexing** — index posts, pages, custom post types, and taxonomies
* **Real-time sync** — automatically index content on publish, update, or delete via WP-Cron
* **WooCommerce support** — full product indexing with variations, price, stock, categories, tags, and attributes
* **Elementor widgets** — drag-and-drop search and autocomplete widgets for Elementor page builder
* **Gutenberg blocks** — native WordPress block editor blocks for search and autocomplete
* **Shortcode support** — embed search anywhere with `[aacsearch_search]`
* **AJAX-powered frontend** — seamless instant search with Highlight.js results rendering
* **Full reindex** — one-click full reindex from the admin dashboard
* **Connection testing** — verify credentials and test API connectivity from settings
* **Async indexing** — non-blocking background indexing via WP-Cron
* **Filter hook** — `aacsearch_document_fields` for custom field indexing (ACF, meta, etc.)
* **Debug log viewer** — built-in troubleshooting with detailed logs
* **Multisite compatible** — works with WordPress Multisite out of the box

**Documents Indexed:**

Each indexed post includes: post ID, title, content, excerpt, permalink, publication date, featured image URL, post type, categories, tags, and any custom fields via the `aacsearch_document_fields` filter hook.

**Addons Included:**

* **WooCommerce Addon** — Full product indexing with variations, price, stock status, categories, tags, attribute-based filtering, and instant search frontend. Activates automatically when WooCommerce is detected.
* **Elementor Integration** — Two dedicated widgets (Search and Autocomplete) found under "AACsearch" category in the Elementor widget panel.
* **Gutenberg Blocks** — Native block editor blocks for embedding search bars and autocomplete dropdowns anywhere in your content.

== Installation ==

1. Upload the `aacsearch-search` folder to the `/wp-content/plugins/` directory, or install directly from **Plugins → Add New → Search "AACsearch Search"**.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Navigate to the **AACsearch** menu in your WordPress admin sidebar.
4. Enter your AACsearch API URL, Search Key (`ss_search_*`), Connector Key (`ss_connector_*`), and Index Slug.
5. Select which post types to index (default: Posts and Pages).
6. Click **Save Settings**, then **Test Connection** to verify your credentials.
7. Click **Run Full Reindex** to send all content to AACsearch.
8. Add search to your site using the `[aacsearch_search]` shortcode, a Gutenberg block, an Elementor widget, or the widget area.

= Minimum Requirements =

* WordPress 5.8 or later
* PHP 7.4 or later
* An AACsearch account (free tier available) with API credentials

= Recommended =

* WordPress 6.0+
* PHP 8.0+
* WP-Cron enabled for real-time sync
* WooCommerce 8.0+ (for product search features)
* Elementor 3.0+ (for Elementor widgets)

== Frequently Asked Questions ==

= What API keys do I need? =

You need two API keys from your AACsearch dashboard:

* **Connector API Key** (`ss_connector_*`) — used for indexing operations (creating, updating, deleting documents)
* **Search API Key** (`ss_search_*`) — used by the frontend search widget for querying

Both keys are generated from your AACsearch dashboard under API Keys.

= Does it support real-time sync? =

Yes. Enable "Real-time Sync" in the plugin settings to automatically index posts when they are published, updated, or deleted. Sync runs asynchronously via WP-Cron so it never blocks the admin interface.

= Can I add custom fields (ACF) to search results? =

Yes. Use the `aacsearch_document_fields` filter hook to add any custom fields, ACF fields, or post meta to the document sent to AACsearch:

```php
add_filter('aacsearch_document_fields', function ($fields, $post_id) {
    $fields['my_custom_field'] = get_field('my_field', $post_id);
    return $fields;
}, 10, 2);
```

= Is WooCommerce supported? =

Yes. The AACsearch WooCommerce Addon is included with the plugin and activates automatically when WooCommerce is detected. It provides:

* Full product indexing with all variations
* Price, stock status, categories, tags, and attributes
* Attribute-based faceted filtering on the frontend
* Instant product search with autocomplete

= Does this work with Elementor? =

Yes. AACsearch Search includes two dedicated Elementor widgets:

* **AACsearch Search** — embed a full instant search bar with autocomplete
* **AACsearch Autocomplete** — embed a compact autocomplete search field

Find them in the Elementor widget panel under the "AACsearch" category.

= Does this work with the Gutenberg block editor? =

Yes. Three Gutenberg blocks are available:

* **Search Bar** — full-width search bar with instant results
* **Autocomplete** — compact autocomplete search field
* **Instant Results** — results display panel

= Is there a free tier? =

Yes. AACsearch offers a generous free tier with 10,000 search requests per month and 5,000 documents. Visit https://aacsearch.com/pricing for full pricing details.

= How do I troubleshoot indexing issues? =

The plugin includes a built-in debug log. Go to AACsearch → Settings and scroll to the Debug Log section. You can view recent log entries, filter by log level, and clear the log. Enable verbose logging in settings for more detailed output.

= Can I use this on a Multisite network? =

Yes. AACsearch Search is fully Multisite compatible. Activate it network-wide or on individual sites as needed. Each site can have its own index configuration.

== Screenshots ==

1. Plugin settings page — configure API URL, search key, connector key, and index slug for your AACsearch connection.
2. Index management dashboard — view document count, last sync time, and run a full reindex.
3. Post type and taxonomy selection — choose which content types to index.
4. Elementor drag-and-drop search widget — add instant search to any page with the Elementor builder.
5. Instant search frontend — live search results with highlighted matches and autocomplete dropdown.

== Changelog ==

= 1.0.0 =
* Initial release.
* Admin settings page with API configuration, connection testing, and debug log.
* Post indexer with configurable post types and bulk reindex support.
* Real-time sync via WP-Cron for automatic indexing on publish/update/delete.
* Shortcode `[aacsearch_search]` for embedding search anywhere.
* Elementor widgets for search bar and autocomplete.
* Gutenberg blocks for search bar, autocomplete, and instant results.
* WooCommerce product indexing with variations, price, stock, and attributes.
* Filter hook `aacsearch_document_fields` for custom field indexing.
* Debug log viewer with level filtering.
* Multisite compatible.
* Translation-ready with text domain `aacsearch-search`.

== Upgrade Notice ==

= 1.0.0 =
Initial release. See changelog for details.
