<?php
/**
 * AACsearch — WordPress Native Plugin
 *
 * @link              https://aacsearch.com
 * @since             1.0.0
 * @package           AACsearch
 *
 * @wordpress-plugin
 * Plugin Name:       AACsearch Connector
 * Plugin URI:        https://aacsearch.com/wordpress
 * Description:       Sync WordPress posts, pages, custom post types, and taxonomies to AACsearch. Supports ACF fields, multisite, and real-time delta sync with WP-CLI bulk import.
 * Version:           1.0.0
 * Author:            AACsearch
 * Author URI:        https://aacsearch.com
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       aac-search
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
define('AACSEARCH_VERSION', '1.0.0');
define('AACSEARCH_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('AACSEARCH_PLUGIN_URL', plugin_dir_url(__FILE__));
define('AACSEARCH_BASENAME', plugin_basename(__FILE__));

/**
 * The core plugin class that bootstraps everything.
 */
require_once AACSEARCH_PLUGIN_DIR . 'includes/class-aac-search-plugin.php';

/**
 * Begins execution of the plugin.
 *
 * @since 1.0.0
 */
function run_aac_search()
{
	$plugin = new AACSearch_Plugin();
	$plugin->run();
}

run_aac_search();
