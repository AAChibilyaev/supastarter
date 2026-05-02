<?php
/**
 * WP-CLI commands for AACsearch Connector.
 *
 * Provides wp-cli commands for bulk import, full sync, diagnostics,
 * and configuration management.
 *
 * @since      1.0.0
 * @package    AACsearch
 */

if (!defined('ABSPATH') && !defined('WP_CLI')) {
	exit;
}

/**
 * Manage AACsearch connector operations from the command line.
 *
 * ## EXAMPLES
 *
 *     # Run a full sync
 *     $ wp aacsearch sync
 *
 *     # Check connection
 *     $ wp aacsearch check
 *
 *     # Send diagnostics
 *     $ wp aacsearch diagnostics
 *
 *     # Get current settings
 *     $ wp aacsearch status
 *
 * @when after_wp_load
 */
class AACSearch_CLI_Commands extends WP_CLI_Command
{
	/**
	 * Run a full sync of all published content to AACsearch.
	 *
	 * ## OPTIONS
	 *
	 * [--post-types=<post-types>]
	 * : Comma-separated list of post types to sync. Default: configured post types.
	 *
	 * [--batch-size=<number>]
	 * : Number of items per batch. Default: configured batch size.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aacsearch sync
	 *     wp aacsearch sync --post-types=post,page,product --batch-size=100
	 *
	 * @subcommand sync
	 *
	 * @param array $args Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function sync($args, $assoc_args)
	{
		$plugin = new AACSearch_Plugin();

		if (!$plugin->is_sync_enabled()) {
			WP_CLI::error('AACsearch sync is not enabled or configured. Check settings first.');
		}

		WP_CLI::line('Starting AACsearch full sync...');

		$result = $plugin->execute_full_sync();

		if ($result['success']) {
			WP_CLI::success($result['message']);
		} else {
			WP_CLI::error('Sync failed: ' . $result['message']);
		}
	}

	/**
	 * Test the connection to the AACsearch API.
	 *
	 * Performs a handshake and displays the result.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aacsearch check
	 *
	 * @subcommand check
	 *
	 * @param array $args Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function check($args, $assoc_args)
	{
		$plugin = new AACSearch_Plugin();

		$api_url         = get_option(AACSearch_Plugin::CFG_API_URL);
		$project_id      = get_option(AACSearch_Plugin::CFG_PROJECT_ID);
		$connector_token = get_option(AACSearch_Plugin::CFG_CONNECTOR_TOKEN);

		if (empty($api_url) || empty($project_id) || empty($connector_token)) {
			WP_CLI::error('AACsearch is not fully configured. Please set API URL, Project ID, and Connector Token.');
		}

		WP_CLI::line('Testing connection to: ' . $api_url);
		WP_CLI::line('Project ID: ' . $project_id);
		WP_CLI::line('Connector Token: ' . substr($connector_token, 0, 8) . '...');

		try {
			$client = $plugin->create_client();
			$result = $client->handshake();

			if ($result) {
				WP_CLI::success('Connection successful! AACsearch API is reachable and responding.');
			} else {
				WP_CLI::error('Handshake failed. Check your credentials.');
			}
		} catch (Exception $e) {
			WP_CLI::error('Connection error: ' . $e->getMessage());
		}
	}

	/**
	 * Send diagnostics to AACsearch.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aacsearch diagnostics
	 *
	 * @subcommand diagnostics
	 *
	 * @param array $args Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function diagnostics($args, $assoc_args)
	{
		$plugin = new AACSearch_Plugin();

		if (!$plugin->is_sync_enabled()) {
			WP_CLI::error('AACsearch is not configured. Please configure first.');
		}

		try {
			WP_CLI::line('Collecting diagnostics...');

			$post_types = $plugin->get_sync_post_types();
			$total_posts = 0;
			foreach ($post_types as $pt) {
				$counts       = wp_count_posts($pt);
				$total_posts += isset($counts->publish) ? (int) $counts->publish : 0;
			}

			$diagnostics = array(
				'lastFullSync'  => get_option('aacsearch_last_full_sync', ''),
				'lastDeltaSync' => get_option('aacsearch_last_delta_sync', ''),
				'totalProducts' => $total_posts,
				'errors'        => AACSearch_Logger::get_recent_errors(),
			);

			WP_CLI::line('Total publishable items: ' . $total_posts);
			WP_CLI::line('Last full sync: ' . ($diagnostics['lastFullSync'] ?: 'Never'));
			WP_CLI::line('Last delta sync: ' . ($diagnostics['lastDeltaSync'] ?: 'Never'));

			$client = $plugin->create_client();
			$result = $client->sendDiagnostics($diagnostics);

			if ($result) {
				WP_CLI::success('Diagnostics sent successfully.');
			} else {
				WP_CLI::error('Failed to send diagnostics.');
			}
		} catch (Exception $e) {
			WP_CLI::error('Diagnostics error: ' . $e->getMessage());
		}
	}

	/**
	 * Display current AACsearch configuration and status.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aacsearch status
	 *
	 * @subcommand status
	 *
	 * @param array $args Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function status($args, $assoc_args)
	{
		$api_url         = get_option(AACSearch_Plugin::CFG_API_URL, __('Not set', AACSearch_Plugin::TEXT_DOMAIN));
		$project_id      = get_option(AACSearch_Plugin::CFG_PROJECT_ID, __('Not set', AACSearch_Plugin::TEXT_DOMAIN));
		$sync_enabled    = get_option(AACSearch_Plugin::CFG_SYNC_ENABLED, '0');
		$widget_enabled  = get_option(AACSearch_Plugin::CFG_WIDGET_ENABLED, '0');
		$batch_size      = get_option(AACSearch_Plugin::CFG_BATCH_SIZE, AACSearch_Plugin::DEFAULT_BATCH_SIZE);
		$post_types      = get_option(AACSearch_Plugin::CFG_POST_TYPES, array('post', 'page'));
		$taxonomies      = get_option(AACSearch_Plugin::CFG_TAXONOMIES, array('category', 'post_tag'));
		$debug_mode      = get_option(AACSearch_Plugin::CFG_DEBUG_MODE, '0');
		$last_full_sync  = get_option('aacsearch_last_full_sync', __('Never', AACSearch_Plugin::TEXT_DOMAIN));
		$last_delta_sync = get_option('aacsearch_last_delta_sync', __('Never', AACSearch_Plugin::TEXT_DOMAIN));

		WP_CLI::line('=== AACsearch Connector Status ===');
		WP_CLI::line('API URL:      ' . $api_url);
		WP_CLI::line('Project ID:   ' . $project_id);
		WP_CLI::line('Sync Enabled: ' . ($sync_enabled === '1' ? 'Yes' : 'No'));
		WP_CLI::line('Widget:       ' . ($widget_enabled === '1' ? 'Enabled' : 'Disabled'));
		WP_CLI::line('Debug Mode:   ' . ($debug_mode === '1' ? 'Enabled' : 'Disabled'));
		WP_CLI::line('Batch Size:   ' . $batch_size);
		WP_CLI::line('Post Types:   ' . implode(', ', (array) $post_types));
		WP_CLI::line('Taxonomies:   ' . implode(', ', (array) $taxonomies));
		WP_CLI::line('Last Full:    ' . $last_full_sync);
		WP_CLI::line('Last Delta:   ' . $last_delta_sync);
		WP_CLI::line('Plugin Ver:   ' . AACSEARCH_VERSION);
		WP_CLI::line('WordPress:    ' . get_bloginfo('version'));
		WP_CLI::line('PHP:          ' . phpversion());
		WP_CLI::line('Multisite:    ' . (is_multisite() ? 'Yes' : 'No'));
	}

	/**
	 * Bulk import content by ID range or specific post IDs.
	 *
	 * ## OPTIONS
	 *
	 * [--ids=<ids>]
	 * : Comma-separated list of post IDs to import.
	 *
	 * [--from=<from>]
	 * : Starting post ID for range import.
	 *
	 * [--to=<to>]
	 * : Ending post ID for range import.
	 *
	 * [--post-type=<post-type>]
	 * : Post type to import (default: all configured types).
	 *
	 * ## EXAMPLES
	 *
	 *     # Import specific posts
	 *     wp aacsearch import --ids=1,2,3,4,5
	 *
	 *     # Import a range of posts
	 *     wp aacsearch import --from=10 --to=100
	 *
	 *     # Import all posts of type 'product'
	 *     wp aacsearch import --post-type=product
	 *
	 * @subcommand import
	 *
	 * @param array $args Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function import($args, $assoc_args)
	{
		$plugin = new AACSearch_Plugin();

		if (!$plugin->is_sync_enabled()) {
			WP_CLI::error('AACsearch is not configured or sync is disabled.');
		}

		$post_type = !empty($assoc_args['post-type'])
			? explode(',', $assoc_args['post-type'])
			: $plugin->get_sync_post_types();

		$post_ids = array();

		// Specific IDs
		if (!empty($assoc_args['ids'])) {
			$post_ids = array_map('intval', explode(',', $assoc_args['ids']));
			$post_ids = array_filter($post_ids, function ($id) { return $id > 0; });
		}

		// Range
		if (!empty($assoc_args['from']) && !empty($assoc_args['to'])) {
			$from = (int) $assoc_args['from'];
			$to   = (int) $assoc_args['to'];
			$post_ids = range($from, $to);
		}

		$exporter = new AACSearch_PostExporter(
			$plugin->get_sync_taxonomies(),
			get_locale()
		);

		$client     = $plugin->create_client();
		$batch_size = (int) get_option(AACSearch_Plugin::CFG_BATCH_SIZE, AACSearch_Plugin::DEFAULT_BATCH_SIZE);
		$total      = 0;

		if (!empty($post_ids)) {
			// Import specific IDs
			$progress = WP_CLI\Utils\make_progress_bar(
				'Importing ' . count($post_ids) . ' posts...',
				count($post_ids)
			);

			$batch = array();
			foreach ($post_ids as $pid) {
				$doc = $exporter->exportSingle($pid);
				if ($doc) {
					$batch[] = $doc;
					$total++;
				}

				if (count($batch) >= $batch_size) {
					$client->deltaSync($batch);
					$batch = array();
				}

				$progress->tick();
			}

			// Remaining
			if (!empty($batch)) {
				$client->deltaSync($batch);
			}

			$progress->finish();
		} else {
			// Import by post type
			WP_CLI::line('Exporting all posts of type: ' . implode(', ', $post_type));
			$batches = $exporter->exportBatches($post_type, $batch_size);
			$count = 0;

			$progress = WP_CLI\Utils\make_progress_bar(
				'Syncing...',
				count($batches)
			);

			foreach ($batches as $batch) {
				if (!empty($batch)) {
					$client->fullSync($batch);
					$count += count($batch);
				}
				$progress->tick();
			}

			$progress->finish();
			$total = $count;
		}

		WP_CLI::success('Import complete. ' . $total . ' items synced to AACsearch.');
	}

	/**
	 * Clear the error log.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aacsearch clear-log
	 *
	 * @subcommand clear-log
	 *
	 * @param array $args Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function clear_log($args, $assoc_args)
	{
		AACSearch_Logger::clear();
		WP_CLI::success('Error log cleared.');
	}
}

WP_CLI::add_command('aacsearch', 'AACSearch_CLI_Commands');
