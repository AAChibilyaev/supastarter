<?php
/**
 * WP-CLI commands for AACsearch Search.
 *
 * Provides wp-cli commands for indexing, reindexing, deletion,
 * and status checks against the AACsearch connector API.
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH') && !defined('WP_CLI')) {
    exit;
}

/**
 * Manage AACsearch search index operations from the command line.
 *
 * ## EXAMPLES
 *
 *     # Index all enabled post types
 *     $ wp aacsearch index
 *
 *     # Index specific post type
 *     $ wp aacsearch index --post_type=product
 *
 *     # Index specific post IDs
 *     $ wp aacsearch index --ids=1,2,3,4,5
 *
 *     # Full reindex (delete + reindex)
 *     $ wp aacsearch reindex
 *
 *     # Delete the entire AACsearch collection
 *     $ wp aacsearch delete
 *
 *     # Show index status
 *     $ wp aacsearch status
 *
 * @when after_wp_load
 */
class AACSearch_CLI_Commands extends WP_CLI_Command
{
    /**
     * Get the indexer instance from saved settings.
     *
     * @return AACSearch_Indexer|null
     */
    protected function get_indexer()
    {
        $api_url       = get_option(AACSearch_Admin::OPTION_API_URL, '');
        $connector_key = get_option(AACSearch_Admin::OPTION_CONNECTOR_KEY, '');
        $index_slug    = get_option(AACSearch_Admin::OPTION_INDEX_SLUG, '');

        if (empty($api_url) || empty($connector_key) || empty($index_slug)) {
            WP_CLI::error('AACsearch is not configured. Run `wp aacsearch status` to check settings.');
            return null;
        }

        return new AACSearch_Indexer($api_url, $connector_key, $index_slug);
    }

    /**
     * Index content into AACsearch.
     *
     * ## OPTIONS
     *
     * [--post_type=<post_type>]
     * : Index a specific post type only. Default: all enabled post types.
     *
     * [--ids=<ids>]
     * : Comma-separated list of specific post IDs to index.
     *
     * [--batch-size=<number>]
     * : Number of posts per batch. Default: 100.
     *
     * ## EXAMPLES
     *
     *     wp aacsearch index
     *     wp aacsearch index --post_type=post
     *     wp aacsearch index --ids=1,2,3 --batch-size=50
     *
     * @subcommand index
     *
     * @param array $args       Positional arguments.
     * @param array $assoc_args Associative arguments.
     */
    public function index($args, $assoc_args)
    {
        $indexer = $this->get_indexer();
        if (!$indexer) {
            return;
        }

        $batch_size = (int) WP_CLI\Utils\get_flag_value($assoc_args, 'batch-size', 100);
        $ids        = WP_CLI\Utils\get_flag_value($assoc_args, 'ids', '');
        $post_type  = WP_CLI\Utils\get_flag_value($assoc_args, 'post_type', '');

        // Index specific IDs
        if (!empty($ids)) {
            $post_ids = array_map('intval', array_filter(explode(',', $ids)));
            $total    = count($post_ids);
            $indexed  = 0;

            $progress = WP_CLI\Utils\make_progress_bar(
                sprintf('Indexing %d posts', $total),
                $total
            );

            foreach ($post_ids as $pid) {
                if ($indexer->index_post($pid)) {
                    $indexed++;
                }
                $progress->tick();
            }
            $progress->finish();

            WP_CLI::success(sprintf('Indexed %d of %d specified posts.', $indexed, $total));
            return;
        }

        // Determine post types
        if (!empty($post_type)) {
            $post_types = [$post_type];
        } else {
            $post_types = get_option(AACSearch_Admin::OPTION_POST_TYPES, ['post', 'page']);
        }

        WP_CLI::line(sprintf('Indexing post types: %s', implode(', ', $post_types)));

        $result = $indexer->bulk_index((array) $post_types, $batch_size);

        if ($result['success']) {
            update_option(AACSearch_Admin::OPTION_LAST_SYNC_TIME, current_time('c'));
            update_option(AACSearch_Admin::OPTION_DOCUMENT_COUNT, $result['indexed']);
            WP_CLI::success($result['message']);
        } else {
            WP_CLI::warning(sprintf(
                'Indexed %d documents before error: %s',
                $result['indexed'],
                $result['message']
            ));
        }
    }

    /**
     * Delete the AACsearch collection and reindex all content.
     *
     * ## OPTIONS
     *
     * [--post_type=<post_type>]
     * : Index a specific post type only. Default: all enabled post types.
     *
     * [--batch-size=<number>]
     * : Number of posts per batch. Default: 100.
     *
     * ## EXAMPLES
     *
     *     wp aacsearch reindex
     *     wp aacsearch reindex --post_type=page
     *
     * @subcommand reindex
     *
     * @param array $args       Positional arguments.
     * @param array $assoc_args Associative arguments.
     */
    public function reindex($args, $assoc_args)
    {
        WP_CLI::line('Starting full reindex...');

        $batch_size = (int) WP_CLI\Utils\get_flag_value($assoc_args, 'batch-size', 100);
        $post_type  = WP_CLI\Utils\get_flag_value($assoc_args, 'post_type', '');

        $indexer = $this->get_indexer();
        if (!$indexer) {
            return;
        }

        // Determine post types
        if (!empty($post_type)) {
            $post_types = [$post_type];
        } else {
            $post_types = get_option(AACSearch_Admin::OPTION_POST_TYPES, ['post', 'page']);
        }

        WP_CLI::line(sprintf('Post types: %s', implode(', ', $post_types)));

        $result = $indexer->bulk_index((array) $post_types, $batch_size);

        if ($result['success']) {
            update_option(AACSearch_Admin::OPTION_LAST_SYNC_TIME, current_time('c'));
            update_option(AACSearch_Admin::OPTION_DOCUMENT_COUNT, $result['indexed']);
            WP_CLI::success($result['message']);
        } else {
            WP_CLI::error(sprintf(
                'Reindex partially failed after %d documents: %s',
                $result['indexed'],
                $result['message']
            ));
        }
    }

    /**
     * Delete all documents from the AACsearch index.
     *
     * ## OPTIONS
     *
     * [--yes]
     * : Skip confirmation prompt.
     *
     * ## EXAMPLES
     *
     *     wp aacsearch delete
     *     wp aacsearch delete --yes
     *
     * @subcommand delete
     *
     * @param array $args       Positional arguments.
     * @param array $assoc_args Associative arguments.
     */
    public function delete($args, $assoc_args)
    {
        $indexer = $this->get_indexer();
        if (!$indexer) {
            return;
        }

        WP_CLI::confirm('Are you sure you want to delete all documents from the AACsearch index?', $assoc_args);

        $post_types = get_option(AACSearch_Admin::OPTION_POST_TYPES, ['post', 'page']);

        WP_CLI::line('Deleting documents...');

        // Get all published post IDs and delete them one by one
        $paged     = 1;
        $total     = 0;
        $max_query = 50000;

        while ($total < $max_query) {
            $posts = get_posts([
                'post_type'      => $post_types,
                'post_status'    => 'publish',
                'posts_per_page' => 100,
                'paged'          => $paged,
                'fields'         => 'ids',
                'orderby'        => 'ID',
                'order'          => 'ASC',
                'no_found_rows'  => true,
            ]);

            if (empty($posts)) {
                break;
            }

            $deleted_count = 0;
            foreach ($posts as $post_id) {
                if ($indexer->delete_post($post_id)) {
                    $deleted_count++;
                }
            }

            $total += $deleted_count;
            $paged++;
        }

        update_option(AACSearch_Admin::OPTION_DOCUMENT_COUNT, 0);
        update_option(AACSearch_Admin::OPTION_LAST_SYNC_TIME, current_time('c'));

        WP_CLI::success(sprintf('Deleted %d documents from AACsearch.', $total));
    }

    /**
     * Show the current index status and plugin configuration.
     *
     * ## EXAMPLES
     *
     *     wp aacsearch status
     *
     * @subcommand status
     *
     * @param array $args       Positional arguments.
     * @param array $assoc_args Associative arguments.
     */
    public function status($args, $assoc_args)
    {
        $api_url       = get_option(AACSearch_Admin::OPTION_API_URL, '');
        $search_key    = get_option(AACSearch_Admin::OPTION_SEARCH_KEY, '');
        $connector_key = get_option(AACSearch_Admin::OPTION_CONNECTOR_KEY, '');
        $index_slug    = get_option(AACSearch_Admin::OPTION_INDEX_SLUG, '');
        $post_types    = get_option(AACSearch_Admin::OPTION_POST_TYPES, ['post', 'page']);
        $sync_enabled  = get_option(AACSearch_Admin::OPTION_SYNC_ENABLED, '0');
        $doc_count     = get_option(AACSearch_Admin::OPTION_DOCUMENT_COUNT, 'N/A');
        $last_sync     = get_option(AACSearch_Admin::OPTION_LAST_SYNC_TIME, 'Never');

        $table = [
            ['API URL', $api_url ?: '—'],
            ['Search Key', !empty($search_key) ? substr($search_key, 0, 12) . '...' : '—'],
            ['Connector Key', !empty($connector_key) ? substr($connector_key, 0, 12) . '...' : '—'],
            ['Index Slug', $index_slug ?: '—'],
            ['Post Types', implode(', ', (array) $post_types)],
            ['Real-time Sync', $sync_enabled === '1' ? 'Enabled' : 'Disabled'],
            ['Document Count', (string) $doc_count],
            ['Last Sync', (string) $last_sync],
        ];

        WP_CLI\Utils\format_items('table', $table, ['Setting', 'Value']);

        // Check connection
        if (!empty($api_url) && !empty($connector_key) && !empty($index_slug)) {
            WP_CLI::line('');
            WP_CLI::line('Testing connection...');

            try {
                $indexer = $this->get_indexer();
                if ($indexer && $indexer->verify_connection()) {
                    WP_CLI::success('Connection: OK');
                } else {
                    WP_CLI::warning('Connection: FAILED — check credentials');
                }
            } catch (Exception $e) {
                WP_CLI::error('Connection error: ' . $e->getMessage());
            }
        }
    }
}

/**
 * Register the WP-CLI command.
 */
WP_CLI::add_command('aacsearch', 'AACSearch_CLI_Commands');
