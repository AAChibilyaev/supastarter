<?php
/**
 * AACsearch Search — WordPress Instant Search Plugin
 *
 * @link              https://aacsearch.com
 * @since             1.0.0
 * @package           AACsearch_Search
 *
 * @wordpress-plugin
 * Plugin Name:       AACsearch Search
 * Plugin URI:        https://aacsearch.com/wordpress
 * Description:       Replace native WordPress search with AACsearch instant search. Index posts, pages, custom post types, and taxonomies with real-time sync. InstantSearch.js-powered frontend.
 * Version:           1.0.0
 * Author:            AACsearch
 * Author URI:        https://aacsearch.com
 * License:           GPL-2.0+
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       aacsearch-search
 * Domain Path:       /languages
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Network:           true
 */

// If this file is called directly, abort.
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Current plugin version.
 */
define('AACSEARCH_SEARCH_VERSION', '1.0.0');

/**
 * Plugin directory path (with trailing slash).
 */
define('AACSEARCH_SEARCH_DIR', plugin_dir_path(__FILE__));

/**
 * Plugin directory URL (with trailing slash).
 */
define('AACSEARCH_SEARCH_URL', plugin_dir_url(__FILE__));

/**
 * Plugin basename for use with activation/deactivation hooks.
 */
define('AACSEARCH_SEARCH_BASENAME', plugin_basename(__FILE__));

/**
 * Text domain for i18n.
 */
define('AACSEARCH_SEARCH_TEXT_DOMAIN', 'aacsearch-search');

// ─── Autoload SDK ────────────────────────────────────────────────

require_once AACSEARCH_SEARCH_DIR . 'lib/aacsearch/Exceptions.php';
require_once AACSEARCH_SEARCH_DIR . 'lib/aacsearch/ConnectorClient.php';

// ─── Autoload Includes ───────────────────────────────────────────

require_once AACSEARCH_SEARCH_DIR . 'includes/class-indexer.php';
require_once AACSEARCH_SEARCH_DIR . 'includes/class-sync.php';
require_once AACSEARCH_SEARCH_DIR . 'includes/class-admin.php';

// ─── Frontend ───────────────────────────────────────────────────

require_once AACSEARCH_SEARCH_DIR . 'includes/class-frontend.php';

// ─── Elementor Widgets (loaded only if Elementor is active) ────

require_once AACSEARCH_SEARCH_DIR . 'includes/class-elementor.php';

// ─── Activation / Deactivation ──────────────────────────────────

register_activation_hook(__FILE__, 'aacsearch_search_activate');
register_deactivation_hook(__FILE__, 'aacsearch_search_deactivate');

/**
 * Plugin activation: set default options and schedule cron.
 */
function aacsearch_search_activate()
{
    // Set default options if not already set
    if (false === get_option(AACSearch_Admin::OPTION_API_URL)) {
        add_option(AACSearch_Admin::OPTION_API_URL, '');
    }
    if (false === get_option(AACSearch_Admin::OPTION_SEARCH_KEY)) {
        add_option(AACSearch_Admin::OPTION_SEARCH_KEY, '');
    }
    if (false === get_option(AACSearch_Admin::OPTION_CONNECTOR_KEY)) {
        add_option(AACSearch_Admin::OPTION_CONNECTOR_KEY, '');
    }
    if (false === get_option(AACSearch_Admin::OPTION_INDEX_SLUG)) {
        add_option(AACSearch_Admin::OPTION_INDEX_SLUG, '');
    }
    if (false === get_option(AACSearch_Admin::OPTION_POST_TYPES)) {
        add_option(AACSearch_Admin::OPTION_POST_TYPES, ['post', 'page']);
    }
    if (false === get_option(AACSearch_Admin::OPTION_SYNC_ENABLED)) {
        add_option(AACSearch_Admin::OPTION_SYNC_ENABLED, '0');
    }
    if (false === get_option(AACSearch_Admin::OPTION_DOCUMENT_COUNT)) {
        add_option(AACSearch_Admin::OPTION_DOCUMENT_COUNT, __('N/A', 'aacsearch-search'));
    }
    if (false === get_option(AACSearch_Admin::OPTION_LAST_SYNC_TIME)) {
        add_option(AACSearch_Admin::OPTION_LAST_SYNC_TIME, __('Never', 'aacsearch-search'));
    }
    if (false === get_option(AACSearch_Admin::OPTION_DEBUG_LOG)) {
        add_option(AACSearch_Admin::OPTION_DEBUG_LOG, []);
    }
}

/**
 * Plugin deactivation: cleanup.
 */
function aacsearch_search_deactivate()
{
    // Nothing to clean up — options are preserved for reactivation.
}

// ─── Text Domain ─────────────────────────────────────────────────

add_action('plugins_loaded', 'aacsearch_search_load_textdomain');

/**
 * Load plugin text domain for i18n.
 */
function aacsearch_search_load_textdomain()
{
    load_plugin_textdomain(
        AACSEARCH_SEARCH_TEXT_DOMAIN,
        false,
        dirname(AACSEARCH_SEARCH_BASENAME) . '/languages'
    );
}

// ─── Initialize Admin ────────────────────────────────────────────

add_action('plugins_loaded', ['AACSearch_Admin', 'init']);

// ─── Initialize Frontend ─────────────────────────────────────────

add_action('plugins_loaded', ['AACSearch_Frontend', 'init']);

// ─── Initialize Real-time Sync ──────────────────────────────────

add_action('plugins_loaded', 'aacsearch_search_init_sync');

/**
 * Initialize real-time sync if enabled and configured.
 */
function aacsearch_search_init_sync()
{
    $sync_enabled = get_option(AACSearch_Admin::OPTION_SYNC_ENABLED, '0');

    if ($sync_enabled !== '1') {
        return;
    }

    $api_url       = get_option(AACSearch_Admin::OPTION_API_URL, '');
    $connector_key = get_option(AACSearch_Admin::OPTION_CONNECTOR_KEY, '');
    $index_slug    = get_option(AACSearch_Admin::OPTION_INDEX_SLUG, '');

    if (empty($api_url) || empty($connector_key) || empty($index_slug)) {
        return;
    }

    $indexer = new AACSearch_Indexer($api_url, $connector_key, $index_slug);
    $sync    = new AACSearch_Sync($indexer, true);
    $sync->register_hooks();
}

// ─── Shortcodes ──────────────────────────────────────────────────

// Shortcodes are registered by AACSearch_Frontend via class-frontend.php
// The [aacsearch_search] shortcode is now handled by the frontend class.
