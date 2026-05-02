=== AACsearch Connector ===
Contributors: aacsearch
Tags: search, typesense, ecommerce, cms, acf, multisite, woocommerce
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Sync WordPress posts, pages, custom post types, taxonomies, and ACF fields to AACsearch hosted search-as-a-service.

== Description ==

AACsearch Connector seamlessly syncs your WordPress content — posts, pages, custom post types, taxonomies, and Advanced Custom Fields — to AACsearch, the hosted search-as-a-service powered by Typesense.

= Features =

* **Real-time sync** — Automatically sync content to AACsearch on post save, update, and delete.
* **Custom Post Types** — Sync any public post type, including WooCommerce products, portfolio items, and custom content.
* **Taxonomy sync** — Index categories, tags, and custom taxonomies as searchable content.
* **ACF Fields** — Automatically include Advanced Custom Fields in your search index.
* **Live Search Widget** — Embed a beautiful, fast live search widget on your front-end with zero configuration.
* **WP-CLI Commands** — Bulk import, full sync, diagnostics, and status checks from the command line.
* **Multisite Support** — Fully compatible with WordPress Multisite networks.
* **Delta Sync** — Only changed content is synced, keeping your index up-to-date efficiently.

= Requirements =

* PHP 7.4 or higher
* WordPress 5.8 or higher
* AACsearch account with a project and connector token (ss_connector_*)

== Installation ==

1. Upload the `aac-search` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Go to the AACsearch menu in your WordPress admin.
4. Enter your API URL, Project ID, and Connector Token.
5. Select which post types and taxonomies to sync.
6. Save settings and click "Test Connection".
7. Click "Run Full Sync" to index all your content.

= WP-CLI Quick Start =

    # Check connection
    wp aacsearch check

    # Run full sync
    wp aacsearch sync

    # Import specific posts
    wp aacsearch import --ids=1,2,3

    # Check status
    wp aacsearch status

== Frequently Asked Questions ==

= Does this work with WooCommerce? =

Yes! WooCommerce products are custom post types ('product') and are fully supported. Product prices, SKUs, stock status, and attributes are automatically indexed.

= Does this work with ACF? =

Yes. Advanced Custom Fields values are automatically included in the search index as `acf_*` attributes.

= Can I use this on a multisite network? =

Yes. The plugin is network-aware and creates per-site configuration on new site creation.

= Is my data secure? =

All API communication uses HTTPS with Bearer token authentication. Connector tokens (ss_connector_*) are stored securely and never exposed.

== Changelog ==

= 1.0.0 =
* Initial release.
* Post/CPT sync with real-time hooks.
* Taxonomy sync (categories, tags, custom taxonomies).
* ACF field integration.
* Live search widget.
* WP-CLI commands (sync, check, import, diagnostics, status).
* Multisite support.
* Scheduled delta sync via WP-Cron.
