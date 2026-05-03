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
 *     # Delete + reindex in one command
 *     $ wp aacsearch delete-reindex
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
     * Get the connector client directly from saved settings.
     *
     * @return Aacsearch\ConnectorClient|null
     */
    protected function get_client()
    {
        $api_url       = get_option(AACSearch_Admin::OPTION_API_URL, '');
        $connector_key = get_option(AACSearch_Admin::OPTION_CONNECTOR_KEY, '');
        $index_slug    = get_option(AACSearch_Admin::OPTION_INDEX_SLUG, '');

        if (empty($api_url) || empty($connector_key) || empty($index_slug)) {
            return null;
        }

        return new Aacsearch\ConnectorClient(
            $api_url,
            $index_slug,
            $connector_key,
            30,
            'AACsearch-WordPress/' . AACSEARCH_SEARCH_VERSION
        );
    }

    /**
     * Get all published post IDs for the given post types, paginated.
     *
     * @param string[] $post_types Post type slugs.
     * @param int      $batch_size Page size per query.
     *
     * @return int[] List of post IDs.
     */
    protected function get_all_published_ids(array $post_types, int $batch_size = 500): array
    {
        $all_ids = [];
        $paged   = 1;
        $max     = 100000; // Safety limit

        while (count($all_ids) < $max) {
            $posts = get_posts([
                'post_type'      => $post_types,
                'post_status'    => 'publish',
                'posts_per_page' => $batch_size,
                'paged'          => $paged,
                'fields'         => 'ids',
                'orderby'        => 'ID',
                'order'          => 'ASC',
                'no_found_rows'  => false,
            ]);

            if (empty($posts)) {
                break;
            }

            $all_ids = array_merge($all_ids, $posts);
            $paged++;
        }

        return $all_ids;
    }

    /**
     * Count the total published posts across post types.
     *
     * @param string[] $post_types Post type slugs.
     *
     * @return int Total published count.
     */
    protected function count_published_posts(array $post_types): int
    {
        $total = 0;
        foreach ($post_types as $pt) {
            $counts = wp_count_posts($pt);
            if ($counts && isset($counts->publish)) {
                $total += (int) $counts->publish;
            }
        }
        return $total;
    }

    /**
     * Delete all documents from AACsearch using batch API.
     *
     * @param AACSearch_Indexer $indexer    Indexer instance (for log_error).
     * @param string[]          $post_types Post type slugs to delete.
     *
     * @return int Number of documents deleted.
     */
    protected function delete_all_documents(AACSearch_Indexer $indexer, array $post_types): int
    {
        $client = $this->get_client();
        if (!$client) {
            WP_CLI::error('Cannot connect to AACsearch. Check your settings.');
            return 0;
        }

        $all_ids = $this->get_all_published_ids($post_types, 500);
        $total   = count($all_ids);

        if ($total === 0) {
            WP_CLI::line('No published posts found to delete.');
            return 0;
        }

        WP_CLI::line(sprintf('Found %d documents to delete from AACsearch...', $total));

        $progress = WP_CLI\Utils\make_progress_bar(
            sprintf('Deleting %d documents', $total),
            $total
        );

        $total_deleted = 0;

        // Process in chunks of 500 (matching batchDelete chunk size)
        foreach (array_chunk($all_ids, 500) as $chunk) {
            try {
                $chunk_ids = array_map('strval', $chunk);
                $deleted   = $client->batchDelete($chunk_ids);
                $total_deleted += $deleted;
            } catch (Exception $e) {
                $indexer->log_error('Batch delete failed: ' . $e->getMessage());
                WP_CLI::warning('Batch delete error: ' . $e->getMessage());
            }

            for ($i = 0; $i < count($chunk); $i++) {
                $progress->tick();
            }
        }

        $progress->finish();

        return $total_deleted;
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

        $total_posts = $this->count_published_posts((array) $post_types);

        WP_CLI::line(sprintf(
            'Indexing post types: %s (%d documents)',
            implode(', ', $post_types),
            $total_posts
        ));

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
     * Deletes all existing documents from the AACsearch index, then
     * performs a full reindex of all published posts.
     *
     * ## OPTIONS
     *
     * [--post_type=<post_type>]
     * : Index a specific post type only. Default: all enabled post types.
     *
     * [--batch-size=<number>]
     * : Number of posts per batch. Default: 100.
     *
     * [--yes]
     * : Skip confirmation prompt.
     *
     * ## EXAMPLES
     *
     *     wp aacsearch reindex
     *     wp aacsearch reindex --post_type=page
     *     wp aacsearch reindex --yes
     *
     * @subcommand reindex
     *
     * @param array $args       Positional arguments.
     * @param array $assoc_args Associative arguments.
     */
    public function reindex($args, $assoc_args)
    {
        $indexer = $this->get_indexer();
        if (!$indexer) {
            return;
        }

        $batch_size = (int) WP_CLI\Utils\get_flag_value($assoc_args, 'batch-size', 100);
        $post_type  = WP_CLI\Utils\get_flag_value($assoc_args, 'post_type', '');

        // Determine post types
        if (!empty($post_type)) {
            $post_types = [$post_type];
        } else {
            $post_types = get_option(AACSearch_Admin::OPTION_POST_TYPES, ['post', 'page']);
        }

        WP_CLI::confirm(
            sprintf(
                'This will DELETE all existing AACsearch documents and reindex. Continue? Post types: %s',
                implode(', ', $post_types)
            ),
            $assoc_args
        );

        // Phase 1: Delete existing documents
        WP_CLI::line('');
        WP_CLI::line('Phase 1: Deleting existing documents...');
        $total_deleted = $this->delete_all_documents($indexer, (array) $post_types);
        WP_CLI::success(sprintf('Deleted %d documents from AACsearch.', $total_deleted));

        // Phase 2: Full reindex
        WP_CLI::line('');
        WP_CLI::line('Phase 2: Reindexing all content...');
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

        $post_types = get_option(AACSearch_Admin::OPTION_POST_TYPES, ['post', 'page']);

        WP_CLI::confirm(
            sprintf(
                'Are you sure you want to delete all %s documents from the AACsearch index?',
                implode(', ', (array) $post_types)
            ),
            $assoc_args
        );

        $total_deleted = $this->delete_all_documents($indexer, (array) $post_types);

        update_option(AACSearch_Admin::OPTION_DOCUMENT_COUNT, 0);
        update_option(AACSearch_Admin::OPTION_LAST_SYNC_TIME, current_time('c'));

        WP_CLI::success(sprintf('Deleted %d documents from AACsearch.', $total_deleted));
    }

    /**
     * Delete and reindex in one command.
     *
     * Combines `wp aacsearch delete` and `wp aacsearch index` into
     * a single atomic operation. Useful for resetting the search index
     * when schema fields have changed.
     *
     * ## OPTIONS
     *
     * [--post_type=<post_type>]
     * : Index a specific post type only. Default: all enabled post types.
     *
     * [--batch-size=<number>]
     * : Number of posts per batch. Default: 100.
     *
     * [--yes]
     * : Skip confirmation prompt.
     *
     * ## EXAMPLES
     *
     *     wp aacsearch delete-reindex
     *     wp aacsearch delete-reindex --post_type=product --yes
     *
     * @subcommand delete-reindex
     *
     * @param array $args       Positional arguments.
     * @param array $assoc_args Associative arguments.
     */
    public function delete_reindex($args, $assoc_args)
    {
        // Reuse the reindex implementation — same flow: delete + index
        $this->reindex($args, $assoc_args);
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
