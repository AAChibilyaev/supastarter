<?php
/**
 * The core plugin class.
 *
 * Bootstraps all WordPress hooks, admin screens, widget injection,
 * WP-CLI commands, and scheduled tasks.
 *
 * @since      1.0.0
 * @package    AACsearch
 */
if (!defined('ABSPATH')) {
	exit;
}

class AACSearch_Plugin
{
	/**
	 * Configuration option keys.
	 */
	const CFG_API_URL         = 'aacsearch_api_url';
	const CFG_PROJECT_ID      = 'aacsearch_project_id';
	const CFG_CONNECTOR_TOKEN = 'aacsearch_connector_token';
	const CFG_SYNC_ENABLED    = 'aacsearch_sync_enabled';
	const CFG_WIDGET_ENABLED  = 'aacsearch_widget_enabled';
	const CFG_POST_TYPES      = 'aacsearch_post_types';
	const CFG_TAXONOMIES       = 'aacsearch_taxonomies';
	const CFG_BATCH_SIZE      = 'aacsearch_batch_size';
	const CFG_DEBUG_MODE      = 'aacsearch_debug_mode';

	const DEFAULT_BATCH_SIZE  = 50;
	const TEXT_DOMAIN         = 'aac-search';

	/**
	 * Define the core functionality of the plugin.
	 *
	 * @since 1.0.0
	 */
	public function run()
	{
		$this->load_dependencies();
		$this->register_hooks();
	}

	/**
	 * Load required class files.
	 */
	protected function load_dependencies()
	{
		require_once AACSEARCH_PLUGIN_DIR . 'includes/class-aac-search-client.php';
		require_once AACSEARCH_PLUGIN_DIR . 'includes/class-aac-search-post-exporter.php';
		require_once AACSEARCH_PLUGIN_DIR . 'includes/class-aac-search-taxonomy-exporter.php';
		require_once AACSEARCH_PLUGIN_DIR . 'includes/class-aac-search-scheduler.php';
		require_once AACSEARCH_PLUGIN_DIR . 'includes/class-aac-search-logger.php';

		if (defined('WP_CLI') && WP_CLI) {
			require_once AACSEARCH_PLUGIN_DIR . 'wp-cli/class-aac-search-cli-commands.php';
		}
	}

	/**
	 * Register all WordPress hooks.
	 */
	protected function register_hooks()
	{
		// Admin
		add_action('admin_menu', array($this, 'add_admin_menu'));
		add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
		add_action('wp_ajax_aacsearch_test_connection', array($this, 'ajax_test_connection'));
		add_action('wp_ajax_aacsearch_run_full_sync', array($this, 'ajax_run_full_sync'));
		add_action('wp_ajax_aacsearch_send_diagnostics', array($this, 'ajax_send_diagnostics'));

		// Front-end widget
		add_action('wp_head', array($this, 'inject_widget_assets'));
		add_action('wp_footer', array($this, 'inject_widget_script'));

		// Post save / delete hooks
		if ($this->is_sync_enabled()) {
			add_action('save_post', array($this, 'on_post_save'), 10, 3);
			add_action('before_delete_post', array($this, 'on_post_delete'), 10, 1);
			add_action('trashed_post', array($this, 'on_post_delete'), 10, 1);
			add_action('wp_trash_post', array($this, 'on_post_delete'), 10, 1);

			// Term hooks
			add_action('created_term', array($this, 'on_term_save'), 10, 3);
			add_action('edited_term', array($this, 'on_term_save'), 10, 3);
			add_action('delete_term', array($this, 'on_term_delete'), 10, 3);

			// Multisite blog activation / deletion
			if (is_multisite()) {
				add_action('wp_initialize_site', array($this, 'on_site_create'), 10, 2);
				add_action('wp_uninitialize_site', array($this, 'on_site_delete'), 10, 1);
			}

			// Scheduled sync
			add_action('aacsearch_daily_sync', array($this, 'run_scheduled_sync'));
		}

		// Plugin lifecycle
		register_activation_hook(AACSEARCH_BASENAME, array($this, 'activate'));
		register_deactivation_hook(AACSEARCH_BASENAME, array($this, 'deactivate'));
		add_action('plugins_loaded', array($this, 'load_textdomain'));
	}

	/**
	 * Load plugin textdomain for i18n.
	 */
	public function load_textdomain()
	{
		load_plugin_textdomain(
			self::TEXT_DOMAIN,
			false,
			dirname(AACSEARCH_BASENAME) . '/languages'
		);
	}

	/**
	 * Plugin activation.
	 */
	public function activate()
	{
		$this->set_defaults();
		if (!wp_next_scheduled('aacsearch_daily_sync')) {
			wp_schedule_event(time(), 'daily', 'aacsearch_daily_sync');
		}
	}

	/**
	 * Plugin deactivation.
	 */
	public function deactivate()
	{
		$timestamp = wp_next_scheduled('aacsearch_daily_sync');
		if ($timestamp) {
			wp_unschedule_event($timestamp, 'aacsearch_daily_sync');
		}
	}

	/**
	 * Set default configuration options.
	 */
	protected function set_defaults()
	{
		if (!get_option(self::CFG_API_URL)) {
			add_option(self::CFG_API_URL, 'https://api.example.com');
		}
		if (!get_option(self::CFG_PROJECT_ID)) {
			add_option(self::CFG_PROJECT_ID, '');
		}
		if (!get_option(self::CFG_CONNECTOR_TOKEN)) {
			add_option(self::CFG_CONNECTOR_TOKEN, '');
		}
		if (!get_option(self::CFG_SYNC_ENABLED)) {
			add_option(self::CFG_SYNC_ENABLED, '0');
		}
		if (!get_option(self::CFG_WIDGET_ENABLED)) {
			add_option(self::CFG_WIDGET_ENABLED, '0');
		}
		if (!get_option(self::CFG_POST_TYPES)) {
			add_option(self::CFG_POST_TYPES, array('post', 'page'));
		}
		if (!get_option(self::CFG_TAXONOMIES)) {
			add_option(self::CFG_TAXONOMIES, array('category', 'post_tag'));
		}
		if (!get_option(self::CFG_BATCH_SIZE)) {
			add_option(self::CFG_BATCH_SIZE, self::DEFAULT_BATCH_SIZE);
		}
		if (!get_option(self::CFG_DEBUG_MODE)) {
			add_option(self::CFG_DEBUG_MODE, '0');
		}
	}

	/**
	 * Check if sync is configured and enabled.
	 *
	 * @return bool
	 */
	public function is_sync_enabled()
	{
		return get_option(self::CFG_SYNC_ENABLED) === '1'
			&& !empty(get_option(self::CFG_API_URL))
			&& !empty(get_option(self::CFG_PROJECT_ID))
			&& !empty(get_option(self::CFG_CONNECTOR_TOKEN));
	}

	/**
	 * Create an API client instance from saved settings.
	 *
	 * @return AACSearch_Client
	 */
	public function create_client()
	{
		return new AACSearch_Client(
			get_option(self::CFG_API_URL),
			get_option(self::CFG_PROJECT_ID),
			get_option(self::CFG_CONNECTOR_TOKEN)
		);
	}

	/**
	 * Get selected post types for sync.
	 *
	 * @return string[]
	 */
	public function get_sync_post_types()
	{
		$types = get_option(self::CFG_POST_TYPES, array('post', 'page'));
		return is_array($types) ? $types : array('post', 'page');
	}

	/**
	 * Get selected taxonomies for sync.
	 *
	 * @return string[]
	 */
	public function get_sync_taxonomies()
	{
		$taxes = get_option(self::CFG_TAXONOMIES, array('category', 'post_tag'));
		return is_array($taxes) ? $taxes : array('category', 'post_tag');
	}

	// ─── Post Hooks ────────────────────────────────────────────

	/**
	 * Handle post save event — delta sync the post to AACsearch.
	 *
	 * @param int     $post_id Post ID.
	 * @param WP_Post $post    Post object.
	 * @param bool    $update  Whether this is an existing post being updated.
	 */
	public function on_post_save($post_id, $post, $update)
	{
		// Skip autosaves and revisions
		if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
			return;
		}
		if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
			return;
		}

		$post_types = $this->get_sync_post_types();
		if (!in_array($post->post_type, $post_types, true)) {
			return;
		}

		$this->sync_single_post($post_id);
	}

	/**
	 * Handle post delete event — delete from AACsearch.
	 *
	 * @param int $post_id Post ID.
	 */
	public function on_post_delete($post_id)
	{
		$post = get_post($post_id);
		if (!$post) {
			return;
		}

		$post_types = $this->get_sync_post_types();
		if (!in_array($post->post_type, $post_types, true)) {
			return;
		}

		try {
			$client = $this->create_client();
			$client->deleteProduct((string) $post_id);
			AACSearch_Logger::debug('Deleted post ' . $post_id . ' from AACsearch.');
		} catch (Exception $e) {
			AACSearch_Logger::error('Failed to delete post ' . $post_id . ': ' . $e->getMessage());
		}
	}

	// ─── Term Hooks ────────────────────────────────────────────

	/**
	 * Handle term save.
	 *
	 * @param int    $term_id  Term ID.
	 * @param int    $tt_id    Term taxonomy ID.
	 * @param string $taxonomy Taxonomy slug.
	 */
	public function on_term_save($term_id, $tt_id, $taxonomy)
	{
		$taxonomies = $this->get_sync_taxonomies();
		if (!in_array($taxonomy, $taxonomies, true)) {
			return;
		}

		try {
			$exporter = new AACSearch_TaxonomyExporter(
				$this->create_client(),
				$this->get_sync_taxonomies()
			);
			$document = $exporter->exportSingle($term_id, $taxonomy);
			if ($document) {
				$this->create_client()->deltaSync(array($document));
				AACSearch_Logger::debug('Delta synced term ' . $term_id . ' (' . $taxonomy . ').');
			}
		} catch (Exception $e) {
			AACSearch_Logger::error('Failed to sync term ' . $term_id . ': ' . $e->getMessage());
		}
	}

	/**
	 * Handle term deletion.
	 *
	 * @param int    $term_id  Term ID.
	 * @param int    $tt_id    Term taxonomy ID.
	 * @param string $taxonomy Taxonomy slug.
	 */
	public function on_term_delete($term_id, $tt_id, $taxonomy)
	{
		$taxonomies = $this->get_sync_taxonomies();
		if (!in_array($taxonomy, $taxonomies, true)) {
			return;
		}

		try {
			$this->create_client()->deleteProduct($taxonomy . '_' . $term_id);
			AACSearch_Logger::debug('Deleted term ' . $term_id . ' from AACsearch.');
		} catch (Exception $e) {
			AACSearch_Logger::error('Failed to delete term ' . $term_id . ': ' . $e->getMessage());
		}
	}

	// ─── Multisite Hooks ──────────────────────────────────────

	/**
	 * Handle new site creation in multisite.
	 *
	 * @param WP_Site $new_site New site object.
	 * @param array   $args     Arguments.
	 */
	public function on_site_create($new_site, $args)
	{
		switch_to_blog($new_site->blog_id);
		$this->set_defaults();
		restore_current_blog();
	}

	/**
	 * Handle site deletion in multisite.
	 *
	 * @param WP_Site $old_site Deleted site object.
	 */
	public function on_site_delete($old_site)
	{
		// Cleanup per-site options on deletion
		delete_blog_option($old_site->blog_id, self::CFG_API_URL);
		delete_blog_option($old_site->blog_id, self::CFG_PROJECT_ID);
		delete_blog_option($old_site->blog_id, self::CFG_CONNECTOR_TOKEN);
		delete_blog_option($old_site->blog_id, self::CFG_SYNC_ENABLED);
		delete_blog_option($old_site->blog_id, self::CFG_WIDGET_ENABLED);
		delete_blog_option($old_site->blog_id, self::CFG_POST_TYPES);
		delete_blog_option($old_site->blog_id, self::CFG_TAXONOMIES);
	}

	// ─── Sync Actions ─────────────────────────────────────────

	/**
	 * Sync a single post to AACsearch via delta sync.
	 *
	 * @param int $post_id Post ID.
	 */
	protected function sync_single_post($post_id)
	{
		try {
			$exporter = new AACSearch_PostExporter(
				$this->get_sync_taxonomies(),
				get_locale()
			);
			$document = $exporter->exportSingle($post_id);
			if (!$document) {
				return;
			}

			$client = $this->create_client();
			$client->deltaSync(array($document));
			AACSearch_Logger::debug('Delta synced post ' . $post_id . ' to AACsearch.');
		} catch (Exception $e) {
			AACSearch_Logger::error('Failed to delta sync post ' . $post_id . ': ' . $e->getMessage());
		}
	}

	/**
	 * Run a full sync from a batch context.
	 *
	 * @return array{success: bool, message: string}
	 */
	public function execute_full_sync()
	{
		try {
			$client = $this->create_client();

			$handshake = $client->handshake();
			if (!$handshake) {
				return array(
					'success' => false,
					'message' => __('Handshake with AACsearch API failed. Check credentials.', self::TEXT_DOMAIN),
				);
			}

			$post_exporter = new AACSearch_PostExporter(
				$this->get_sync_taxonomies(),
				get_locale()
			);
			$tax_exporter = new AACSearch_TaxonomyExporter(
				$client,
				$this->get_sync_taxonomies()
			);

			$batch_size = (int) get_option(self::CFG_BATCH_SIZE, self::DEFAULT_BATCH_SIZE);

			// Sync posts
			$post_batches = $post_exporter->exportBatches(
				$this->get_sync_post_types(),
				$batch_size
			);

			$total_posts = 0;
			foreach ($post_batches as $batch) {
				if (!empty($batch)) {
					$client->fullSync($batch);
					$total_posts += count($batch);
				}
			}

			// Sync taxonomies
			$tax_batches = $tax_exporter->exportBatches($batch_size);
			$total_tax = 0;
			foreach ($tax_batches as $batch) {
				if (!empty($batch)) {
					$client->fullSync($batch);
					$total_tax += count($batch);
				}
			}

			update_option('aacsearch_last_full_sync', current_time('c'));

			return array(
				'success' => true,
				'message' => sprintf(
					/* translators: %1$d: post count, %2$d: taxonomy term count */
					__('Full sync completed. %1$d posts and %2$d terms exported.', self::TEXT_DOMAIN),
					$total_posts,
					$total_tax
				),
			);
		} catch (Exception $e) {
			AACSearch_Logger::error('Full sync error: ' . $e->getMessage());
			return array(
				'success' => false,
				'message' => $e->getMessage(),
			);
		}
	}

	/**
	 * Run the scheduled sync (delta). Called by cron.
	 */
	public function run_scheduled_sync()
	{
		if (!$this->is_sync_enabled()) {
			return;
		}

		AACSearch_Logger::debug('Starting scheduled delta sync...');

		try {
			$client = $this->create_client();
			$handshake = $client->handshake();
			if (!$handshake) {
				AACSearch_Logger::error('Scheduled sync: handshake failed.');
				return;
			}

			// Delta sync: sync posts modified in the last 24 hours
			$post_exporter = new AACSearch_PostExporter(
				$this->get_sync_taxonomies(),
				get_locale()
			);

			$recent_posts = get_posts(array(
				'post_type'      => $this->get_sync_post_types(),
				'post_status'    => 'publish',
				'date_query'     => array(
					array(
						'column' => 'post_modified_gmt',
						'after'  => '-24 hours',
					),
				),
				'posts_per_page' => 100,
				'no_found_rows'  => true,
			));

			if (!empty($recent_posts)) {
				$documents = array();
				foreach ($recent_posts as $post) {
					$doc = $post_exporter->buildDocument($post);
					if ($doc) {
						$documents[] = $doc;
					}
				}

				if (!empty($documents)) {
					$client->deltaSync($documents);
					AACSearch_Logger::debug(
						'Scheduled delta sync: ' . count($documents) . ' posts synced.'
					);
				}
			}

			update_option('aacsearch_last_delta_sync', current_time('c'));
		} catch (Exception $e) {
			AACSearch_Logger::error('Scheduled sync error: ' . $e->getMessage());
		}
	}

	// ─── Widget ────────────────────────────────────────────────

	/**
	 * Inject widget CSS into the front-end <head>.
	 */
	public function inject_widget_assets()
	{
		if (get_option(self::CFG_WIDGET_ENABLED) !== '1') {
			return;
		}

		if (!is_admin() && !wp_is_json_request()) {
			wp_enqueue_style(
				'aacsearch-widget',
				AACSEARCH_PLUGIN_URL . 'assets/css/widget.css',
				array(),
				AACSEARCH_VERSION
			);
		}
	}

	/**
	 * Inject widget JavaScript before </body>.
	 */
	public function inject_widget_script()
	{
		if (get_option(self::CFG_WIDGET_ENABLED) !== '1') {
			return;
		}

		$project_id = get_option(self::CFG_PROJECT_ID);
		$api_url    = get_option(self::CFG_API_URL);
		$locale     = get_locale();

		wp_enqueue_script(
			'aacsearch-widget',
			AACSEARCH_PLUGIN_URL . 'assets/js/widget.js',
			array(),
			AACSEARCH_VERSION,
			true
		);

		wp_localize_script('aacsearch-widget', 'AACSearch', array(
			'projectId' => esc_attr($project_id),
			'apiUrl'    => esc_url($api_url),
			'locale'    => esc_attr($locale),
			'ajaxUrl'   => admin_url('admin-ajax.php'),
			'nonce'     => wp_create_nonce('aacsearch_widget'),
		));
	}

	// ─── Admin ─────────────────────────────────────────────────

	/**
	 * Register admin menu page.
	 */
	public function add_admin_menu()
	{
		add_menu_page(
			__('AACsearch Connector', self::TEXT_DOMAIN),
			__('AACsearch', self::TEXT_DOMAIN),
			'manage_options',
			'aacsearch',
			array($this, 'render_admin_page'),
			'dashicons-search',
			30
		);
	}

	/**
	 * Enqueue admin assets.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public function enqueue_admin_assets($hook)
	{
		if ($hook !== 'toplevel_page_aacsearch') {
			return;
		}

		wp_enqueue_style(
			'aacsearch-admin',
			AACSEARCH_PLUGIN_URL . 'assets/css/widget.css',
			array(),
			AACSEARCH_VERSION
		);
	}

	/**
	 * Render the admin settings page.
	 */
	public function render_admin_page()
	{
		require_once AACSEARCH_PLUGIN_DIR . 'admin/views/admin-page.php';
	}

	// ─── AJAX Handlers ─────────────────────────────────────────

	/**
	 * AJAX handler: test connection to AACsearch API.
	 */
	public function ajax_test_connection()
	{
		check_ajax_referer('aacsearch_admin', 'nonce');

		if (!current_user_can('manage_options')) {
			wp_send_json_error(array('message' => __('Permission denied.', self::TEXT_DOMAIN)));
		}

		try {
			$client = $this->create_client();
			$result = $client->handshake();
			if ($result) {
				wp_send_json_success(array(
					'message' => __('Connection successful! AACsearch API is reachable.', self::TEXT_DOMAIN),
				));
			} else {
				wp_send_json_error(array(
					'message' => __('Handshake failed. Check your API URL, Project ID, and Connector Token.', self::TEXT_DOMAIN),
				));
			}
		} catch (Exception $e) {
			wp_send_json_error(array(
				'message' => __('Connection error: ', self::TEXT_DOMAIN) . $e->getMessage(),
			));
		}
	}

	/**
	 * AJAX handler: run full sync.
	 */
	public function ajax_run_full_sync()
	{
		check_ajax_referer('aacsearch_admin', 'nonce');

		if (!current_user_can('manage_options')) {
			wp_send_json_error(array('message' => __('Permission denied.', self::TEXT_DOMAIN)));
		}

		$result = $this->execute_full_sync();
		if ($result['success']) {
			wp_send_json_success($result);
		} else {
			wp_send_json_error($result);
		}
	}

	/**
	 * AJAX handler: send diagnostics.
	 */
	public function ajax_send_diagnostics()
	{
		check_ajax_referer('aacsearch_admin', 'nonce');

		if (!current_user_can('manage_options')) {
			wp_send_json_error(array('message' => __('Permission denied.', self::TEXT_DOMAIN)));
		}

		try {
			$client = $this->create_client();

			$post_types   = $this->get_sync_post_types();
			$total_posts  = 0;
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

			$result = $client->sendDiagnostics($diagnostics);
			if ($result) {
				wp_send_json_success(array(
					'message' => __('Diagnostics sent successfully.', self::TEXT_DOMAIN),
				));
			} else {
				wp_send_json_error(array(
					'message' => __('Failed to send diagnostics.', self::TEXT_DOMAIN),
				));
			}
		} catch (Exception $e) {
			wp_send_json_error(array(
				'message' => __('Diagnostics error: ', self::TEXT_DOMAIN) . $e->getMessage(),
			));
		}
	}
}
