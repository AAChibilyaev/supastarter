<?php
/**
 * AACsearch Admin Settings Page for WordPress.
 *
 * Provides the admin configuration UI for the AACsearch plugin:
 * - AACsearch API URL, search key, connector key, index slug
 * - Post type selection for indexing
 * - Credential verification handshake
 * - Manual full reindex control
 * - Index status display (document count, last sync)
 * - Debug log viewer
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class AACSearch_Admin
{
    /**
     * Option keys stored in wp_options.
     */
    const OPTION_API_URL         = 'aacsearch_api_url';
    const OPTION_SEARCH_KEY      = 'aacsearch_search_key';
    const OPTION_CONNECTOR_KEY   = 'aacsearch_connector_key';
    const OPTION_INDEX_SLUG      = 'aacsearch_index_slug';
    const OPTION_POST_TYPES      = 'aacsearch_post_types';
    const OPTION_SYNC_ENABLED    = 'aacsearch_sync_enabled';
    const OPTION_LAST_SYNC_TIME  = 'aacsearch_last_sync_time';
    const OPTION_DOCUMENT_COUNT  = 'aacsearch_document_count';
    const OPTION_DEBUG_LOG       = 'aacsearch_debug_log';

    /**
     * Menu slug for the admin page.
     */
    const MENU_SLUG = 'aacsearch-settings';

    /**
     * Initialize admin hooks.
     *
     * Call this from the main plugin file on 'plugins_loaded'.
     */
    public static function init()
    {
        $self = new self();
        $self->register_hooks();
    }

    /**
     * Register admin WordPress hooks.
     */
    protected function register_hooks()
    {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
        add_action('wp_ajax_aacsearch_test_connection', [$this, 'ajax_test_connection']);
        add_action('wp_ajax_aacsearch_run_reindex', [$this, 'ajax_run_reindex']);
        add_action('wp_ajax_aacsearch_clear_log', [$this, 'ajax_clear_log']);
        add_action('admin_notices', [$this, 'render_config_notice']);
    }

    /**
     * Add the settings page to the WordPress admin menu.
     */
    public function add_admin_menu()
    {
        add_menu_page(
            __('AACsearch Search', 'aacsearch-search'),
            __('AACsearch', 'aacsearch-search'),
            'manage_options',
            self::MENU_SLUG,
            [$this, 'render_settings_page'],
            'dashicons-search',
            30
        );

        // Add a sub-page for debug log
        add_submenu_page(
            self::MENU_SLUG,
            __('Debug Log', 'aacsearch-search'),
            __('Debug Log', 'aacsearch-search'),
            'manage_options',
            self::MENU_SLUG . '-debug',
            [$this, 'render_debug_page']
        );
    }

    /**
     * Enqueue admin CSS and JS.
     *
     * @param string $hook Current admin page hook.
     */
    public function enqueue_admin_assets($hook)
    {
        if (strpos($hook, self::MENU_SLUG) === false) {
            return;
        }

        wp_enqueue_style(
            'aacsearch-admin',
            AACSEARCH_SEARCH_URL . 'assets/css/admin.css',
            [],
            AACSEARCH_SEARCH_VERSION
        );

        wp_enqueue_script(
            'aacsearch-admin',
            AACSEARCH_SEARCH_URL . 'assets/js/admin.js',
            ['jquery'],
            AACSEARCH_SEARCH_VERSION,
            true
        );

        wp_localize_script('aacsearch-admin', 'aacsearchAdmin', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('aacsearch_admin_nonce'),
            'i18n'    => [
                'testing'         => __('Testing connection...', 'aacsearch-search'),
                'testSuccess'     => __('Connection successful!', 'aacsearch-search'),
                'testFailed'      => __('Connection failed.', 'aacsearch-search'),
                'reindexing'      => __('Reindexing...', 'aacsearch-search'),
                'reindexSuccess'  => __('Reindex completed.', 'aacsearch-search'),
                'confirmReindex'  => __('Are you sure you want to reindex all content? This will send all published posts to AACsearch.', 'aacsearch-search'),
                'error'           => __('Error:', 'aacsearch-search'),
            ],
        ]);
    }

    /**
     * Render the main settings page.
     */
    public function render_settings_page()
    {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions.', 'aacsearch-search'));
        }

        // Handle form submission
        if (isset($_POST['submit']) && check_admin_referer('aacsearch_settings')) {
            $this->save_settings();
        }

        $api_url       = get_option(self::OPTION_API_URL, '');
        $search_key    = get_option(self::OPTION_SEARCH_KEY, '');
        $connector_key = get_option(self::OPTION_CONNECTOR_KEY, '');
        $index_slug    = get_option(self::OPTION_INDEX_SLUG, '');
        $post_types    = get_option(self::OPTION_POST_TYPES, ['post', 'page']);
        $sync_enabled  = get_option(self::OPTION_SYNC_ENABLED, '0');
        $doc_count     = get_option(self::OPTION_DOCUMENT_COUNT, __('N/A', 'aacsearch-search'));
        $last_sync     = get_option(self::OPTION_LAST_SYNC_TIME, __('Never', 'aacsearch-search'));

        $all_post_types = get_post_types(['public' => true], 'objects');
        ?>
        <div class="wrap aacsearch-admin-wrap">
            <h1><?php echo esc_html__('AACsearch Search Settings', 'aacsearch-search'); ?></h1>

            <form method="post" action="">
                <?php wp_nonce_field('aacsearch_settings'); ?>

                <table class="form-table">
                    <tbody>
                        <tr>
                            <th scope="row">
                                <label for="aacsearch_api_url"><?php esc_html_e('AACsearch API URL', 'aacsearch-search'); ?></label>
                            </th>
                            <td>
                                <input type="url"
                                       id="aacsearch_api_url"
                                       name="aacsearch_api_url"
                                       value="<?php echo esc_attr($api_url); ?>"
                                       class="regular-text"
                                       placeholder="https://api.aacsearch.com" />
                                <p class="description">
                                    <?php esc_html_e('Your AACsearch instance API base URL.', 'aacsearch-search'); ?>
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <th scope="row">
                                <label for="aacsearch_search_key"><?php esc_html_e('Search API Key', 'aacsearch-search'); ?></label>
                            </th>
                            <td>
                                <input type="password"
                                       id="aacsearch_search_key"
                                       name="aacsearch_search_key"
                                       value="<?php echo esc_attr($search_key); ?>"
                                       class="regular-text"
                                       placeholder="ss_search_..." />
                                <p class="description">
                                    <?php esc_html_e('Public search API key (ss_search_*). Used by the frontend search widget.', 'aacsearch-search'); ?>
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <th scope="row">
                                <label for="aacsearch_connector_key"><?php esc_html_e('Connector API Key', 'aacsearch-search'); ?></label>
                            </th>
                            <td>
                                <input type="password"
                                       id="aacsearch_connector_key"
                                       name="aacsearch_connector_key"
                                       value="<?php echo esc_attr($connector_key); ?>"
                                       class="regular-text"
                                       placeholder="ss_connector_..." />
                                <p class="description">
                                    <?php esc_html_e('Connector API key (ss_connector_*) for indexing operations.', 'aacsearch-search'); ?>
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <th scope="row">
                                <label for="aacsearch_index_slug"><?php esc_html_e('Index Slug', 'aacsearch-search'); ?></label>
                            </th>
                            <td>
                                <input type="text"
                                       id="aacsearch_index_slug"
                                       name="aacsearch_index_slug"
                                       value="<?php echo esc_attr($index_slug); ?>"
                                       class="regular-text"
                                       placeholder="my-index" />
                                <p class="description">
                                    <?php esc_html_e('The AACsearch index (project) to sync content to.', 'aacsearch-search'); ?>
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <th scope="row">
                                <label for="aacsearch_post_types"><?php esc_html_e('Post Types to Index', 'aacsearch-search'); ?></label>
                            </th>
                            <td>
                                <fieldset>
                                    <?php foreach ($all_post_types as $pt) : ?>
                                        <label style="display: block; margin-bottom: 4px;">
                                            <input type="checkbox"
                                                   name="aacsearch_post_types[]"
                                                   value="<?php echo esc_attr($pt->name); ?>"
                                                   <?php checked(in_array($pt->name, (array) $post_types, true)); ?> />
                                            <?php echo esc_html($pt->label); ?>
                                            <code><?php echo esc_html($pt->name); ?></code>
                                        </label>
                                    <?php endforeach; ?>
                                </fieldset>
                                <p class="description">
                                    <?php esc_html_e('Select which post types to include in the AACsearch index.', 'aacsearch-search'); ?>
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <th scope="row">
                                <label for="aacsearch_sync_enabled"><?php esc_html_e('Real-time Sync', 'aacsearch-search'); ?></label>
                            </th>
                            <td>
                                <label>
                                    <input type="checkbox"
                                           id="aacsearch_sync_enabled"
                                           name="aacsearch_sync_enabled"
                                           value="1"
                                           <?php checked($sync_enabled, '1'); ?> />
                                    <?php esc_html_e('Enable automatic real-time sync on post publish/update/delete', 'aacsearch-search'); ?>
                                </label>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <p class="submit">
                    <button type="submit" name="submit" class="button button-primary">
                        <?php esc_html_e('Save Settings', 'aacsearch-search'); ?>
                    </button>
                    <button type="button" id="aacsearch-test-connection" class="button">
                        <?php esc_html_e('Test Connection', 'aacsearch-search'); ?>
                    </button>
                    <span id="aacsearch-connection-status" style="margin-left: 10px;"></span>
                </p>
            </form>

            <hr />

            <!-- Index Status & Actions -->
            <h2><?php esc_html_e('Index Status', 'aacsearch-search'); ?></h2>

            <table class="widefat striped" style="max-width: 600px;">
                <tbody>
                    <tr>
                        <td><strong><?php esc_html_e('Document Count', 'aacsearch-search'); ?></strong></td>
                        <td><?php echo esc_html($doc_count); ?></td>
                    </tr>
                    <tr>
                        <td><strong><?php esc_html_e('Last Sync', 'aacsearch-search'); ?></strong></td>
                        <td><?php echo esc_html($last_sync); ?></td>
                    </tr>
                </tbody>
            </table>

            <p style="margin-top: 20px;">
                <button type="button" id="aacsearch-run-reindex" class="button button-secondary">
                    <?php esc_html_e('Run Full Reindex', 'aacsearch-search'); ?>
                </button>
                <span id="aacsearch-reindex-status" style="margin-left: 10px;"></span>
            </p>
        </div>
        <?php
    }

    /**
     * Render the debug log page.
     */
    public function render_debug_page()
    {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions.', 'aacsearch-search'));
        }

        $log = get_option(self::OPTION_DEBUG_LOG, []);
        if (!is_array($log)) {
            $log = [];
        }
        $log = array_reverse($log);

        ?>
        <div class="wrap aacsearch-admin-wrap">
            <h1><?php echo esc_html__('AACsearch Debug Log', 'aacsearch-search'); ?></h1>

            <p>
                <button type="button" id="aacsearch-clear-log" class="button">
                    <?php esc_html_e('Clear Log', 'aacsearch-search'); ?>
                </button>
                <span id="aacsearch-clear-log-status" style="margin-left: 10px;"></span>
            </p>

            <table class="widefat striped">
                <thead>
                    <tr>
                        <th><?php esc_html_e('Level', 'aacsearch-search'); ?></th>
                        <th><?php esc_html_e('Message', 'aacsearch-search'); ?></th>
                        <th><?php esc_html_e('Timestamp', 'aacsearch-search'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($log)) : ?>
                        <tr>
                            <td colspan="3"><?php esc_html_e('No log entries.', 'aacsearch-search'); ?></td>
                        </tr>
                    <?php else : ?>
                        <?php foreach ($log as $entry) : ?>
                            <tr class="<?php echo isset($entry['level']) && $entry['level'] === 'ERROR' ? 'error' : ''; ?>">
                                <td>
                                    <strong><?php echo esc_html($entry['level'] ?? 'INFO'); ?></strong>
                                </td>
                                <td><?php echo esc_html($entry['message'] ?? ''); ?></td>
                                <td><?php echo esc_html($entry['timestamp'] ?? ''); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    /**
     * Save settings from the admin form.
     */
    protected function save_settings()
    {
        $api_url       = isset($_POST['aacsearch_api_url']) ? esc_url_raw(wp_unslash($_POST['aacsearch_api_url'])) : '';
        $search_key    = isset($_POST['aacsearch_search_key']) ? sanitize_text_field(wp_unslash($_POST['aacsearch_search_key'])) : '';
        $connector_key = isset($_POST['aacsearch_connector_key']) ? sanitize_text_field(wp_unslash($_POST['aacsearch_connector_key'])) : '';
        $index_slug    = isset($_POST['aacsearch_index_slug']) ? sanitize_text_field(wp_unslash($_POST['aacsearch_index_slug'])) : '';
        $post_types    = isset($_POST['aacsearch_post_types']) ? array_map('sanitize_text_field', wp_unslash($_POST['aacsearch_post_types'])) : [];
        $sync_enabled  = isset($_POST['aacsearch_sync_enabled']) ? '1' : '0';

        update_option(self::OPTION_API_URL, $api_url);
        update_option(self::OPTION_SEARCH_KEY, $search_key);
        update_option(self::OPTION_CONNECTOR_KEY, $connector_key);
        update_option(self::OPTION_INDEX_SLUG, $index_slug);
        update_option(self::OPTION_POST_TYPES, $post_types);
        update_option(self::OPTION_SYNC_ENABLED, $sync_enabled);

        echo '<div class="notice notice-success is-dismissible"><p>'
            . esc_html__('Settings saved.', 'aacsearch-search')
            . '</p></div>';
    }

    /**
     * AJAX handler: test connection to AACsearch.
     */
    public function ajax_test_connection()
    {
        check_ajax_referer('aacsearch_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Permission denied.', 'aacsearch-search')]);
        }

        $api_url       = get_option(self::OPTION_API_URL, '');
        $connector_key = get_option(self::OPTION_CONNECTOR_KEY, '');
        $index_slug    = get_option(self::OPTION_INDEX_SLUG, '');

        if (empty($api_url) || empty($connector_key) || empty($index_slug)) {
            wp_send_json_error([
                'message' => __('Please fill in API URL, Connector Key, and Index Slug before testing.', 'aacsearch-search'),
            ]);
        }

        try {
            $client = new Aacsearch\ConnectorClient(
                $api_url,
                $index_slug,
                $connector_key,
                10,
                'AACsearch-WordPress/' . AACSEARCH_SEARCH_VERSION
            );

            $result = $client->handshake(AACSEARCH_SEARCH_VERSION, 'wordpress');

            if ($result) {
                wp_send_json_success([
                    'message' => __('Connection successful! Project is active.', 'aacsearch-search'),
                ]);
            } else {
                wp_send_json_error([
                    'message' => __('Connection failed. Check your credentials and project status.', 'aacsearch-search'),
                ]);
            }
        } catch (Exception $e) {
            wp_send_json_error([
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * AJAX handler: run full reindex.
     */
    public function ajax_run_reindex()
    {
        check_ajax_referer('aacsearch_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Permission denied.', 'aacsearch-search')]);
        }

        $api_url       = get_option(self::OPTION_API_URL, '');
        $connector_key = get_option(self::OPTION_CONNECTOR_KEY, '');
        $index_slug    = get_option(self::OPTION_INDEX_SLUG, '');
        $post_types    = get_option(self::OPTION_POST_TYPES, ['post', 'page']);

        if (empty($api_url) || empty($connector_key) || empty($index_slug)) {
            wp_send_json_error([
                'message' => __('Please configure API credentials before running reindex.', 'aacsearch-search'),
            ]);
        }

        // Disable time limit for long-running reindex
        set_time_limit(300);

        $indexer = new AACSearch_Indexer($api_url, $connector_key, $index_slug);
        $result  = $indexer->bulk_index((array) $post_types, 100);

        if ($result['success']) {
            update_option(self::OPTION_LAST_SYNC_TIME, current_time('c'));
            update_option(self::OPTION_DOCUMENT_COUNT, $result['indexed']);
        }

        wp_send_json($result);
    }

    /**
     * AJAX handler: clear debug log.
     */
    public function ajax_clear_log()
    {
        check_ajax_referer('aacsearch_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Permission denied.', 'aacsearch-search')]);
        }

        delete_option(self::OPTION_DEBUG_LOG);

        wp_send_json_success([
            'message' => __('Log cleared.', 'aacsearch-search'),
        ]);
    }

    /**
     * Render an admin notice if the plugin is not configured.
     */
    public function render_config_notice()
    {
        // Only show on non-plugin pages
        $screen = get_current_screen();
        if ($screen && strpos($screen->id, self::MENU_SLUG) !== false) {
            return;
        }

        $api_url = get_option(self::OPTION_API_URL, '');
        $key     = get_option(self::OPTION_CONNECTOR_KEY, '');

        if (empty($api_url) || empty($key)) {
            ?>
            <div class="notice notice-warning is-dismissible">
                <p>
                    <?php
                    printf(
                        /* translators: %s: settings page URL */
                        wp_kses(__('AACsearch Search is not yet configured. <a href="%s">Go to Settings</a> to connect to AACsearch.', 'aacsearch-search'), [
                            'a' => ['href' => []],
                        ]),
                        esc_url(admin_url('admin.php?page=' . self::MENU_SLUG))
                    );
                    ?>
                </p>
            </div>
            <?php
        }
    }
}
