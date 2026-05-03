<?php
/**
 * AACsearch Post Indexer for WordPress.
 *
 * Formats WordPress posts, pages, and custom post types into AACsearch
 * documents and sends them to the Connector API.
 *
 * Document schema:
 *   id, post_title, post_content, post_excerpt, permalink, post_date,
 *   thumbnail_url, post_type, categories[], tags[]
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class AACSearch_Indexer
{
    /**
     * AACsearch Connector API URL.
     *
     * @var string
     */
    protected $apiUrl;

    /**
     * Connector API token (ss_connector_*).
     *
     * @var string
     */
    protected $connectorToken;

    /**
     * Index slug (project ID).
     *
     * @var string
     */
    protected $indexSlug;

    /**
     * Internal connector client instance.
     *
     * @var Aacsearch\ConnectorClient|null
     */
    protected $client = null;

    /**
     * @param string $apiUrl         AACsearch Connector API base URL.
     * @param string $connectorToken Connector API key (ss_connector_*).
     * @param string $indexSlug      AACsearch index slug / project ID.
     */
    public function __construct($apiUrl, $connectorToken, $indexSlug)
    {
        $this->apiUrl         = $apiUrl;
        $this->connectorToken = $connectorToken;
        $this->indexSlug      = $indexSlug;
    }

    /**
     * Get or create the connector client.
     *
     * @return Aacsearch\ConnectorClient
     */
    protected function getClient()
    {
        if ($this->client === null) {
            $this->client = new Aacsearch\ConnectorClient(
                $this->apiUrl,
                $this->indexSlug,
                $this->connectorToken,
                30,
                'AACsearch-WordPress/' . AACSEARCH_SEARCH_VERSION
            );
        }

        return $this->client;
    }

    /**
     * Index (upsert) a single post to AACsearch.
     *
     * Formats the post as an AACsearch document and sends it via
     * the connector API delta sync.
     *
     * @param int $post_id Post ID to index.
     *
     * @return bool True on success, false on failure.
     */
    public function index_post($post_id)
    {
        $post_id = (int) $post_id;
        if ($post_id <= 0) {
            return false;
        }

        $post = get_post($post_id);
        if (!$post || $post->post_status !== 'publish') {
            return false;
        }

        $document = $this->build_document($post);
        if ($document === null) {
            return false;
        }

        try {
            $result = $this->getClient()->deltaSync([$document]);
            return $result;
        } catch (Exception $e) {
            $this->log_error('Failed to index post ' . $post_id . ': ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete a post document from AACsearch.
     *
     * @param int $post_id Post ID to delete.
     *
     * @return bool True on success, false on failure.
     */
    public function delete_post($post_id)
    {
        $post_id = (int) $post_id;
        if ($post_id <= 0) {
            return false;
        }

        try {
            $result = $this->getClient()->deleteDocument((string) $post_id);
            return $result;
        } catch (Exception $e) {
            $this->log_error('Failed to delete post ' . $post_id . ' from AACsearch: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Bulk index (full reindex) all posts of specified types.
     *
     * Processes posts in batches and sends each batch to the
     * Connector API full sync endpoint.
     *
     * @param string[] $post_types Array of post type slugs (e.g. ['post', 'page']).
     * @param int      $batch_size Number of posts per batch (default: 100).
     *
     * @return array{success: bool, indexed: int, message: string}
     */
    public function bulk_index(array $post_types = ['post', 'page'], $batch_size = 100)
    {
        if (empty($post_types)) {
            return [
                'success' => false,
                'indexed' => 0,
                'message' => __('No post types selected.', 'aacsearch-search'),
            ];
        }

        $total_indexed = 0;
        $paged         = 1;
        $max_query     = 50000; // Safety limit

        try {
            while ($total_indexed < $max_query) {
                $posts = get_posts([
                    'post_type'      => $post_types,
                    'post_status'    => 'publish',
                    'posts_per_page' => $batch_size,
                    'paged'          => $paged,
                    'orderby'        => 'ID',
                    'order'          => 'ASC',
                    'no_found_rows'  => true,
                ]);

                if (empty($posts)) {
                    break;
                }

                $batch = [];
                foreach ($posts as $post) {
                    $document = $this->build_document($post);
                    if ($document !== null) {
                        $batch[] = $document;
                    }
                }

                if (!empty($batch)) {
                    $this->getClient()->fullSync($batch);
                    $total_indexed += count($batch);
                }

                $paged++;
            }

            return [
                'success' => true,
                'indexed' => $total_indexed,
                'message' => sprintf(
                    /* translators: %d: number of documents indexed */
                    __('Full reindex completed. %d documents sent to AACsearch.', 'aacsearch-search'),
                    $total_indexed
                ),
            ];
        } catch (Exception $e) {
            $this->log_error('Bulk index failed after ' . $total_indexed . ' documents: ' . $e->getMessage());

            return [
                'success' => false,
                'indexed' => $total_indexed,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Build an AACsearch document array from a WP_Post object.
     *
     * @param WP_Post $post WordPress post object.
     *
     * @return array|null Document array, or null if post is invalid.
     */
    public function build_document($post)
    {
        if (!$post || !isset($post->ID)) {
            return null;
        }

        $post_id = (int) $post->ID;

        // ─── Title ────────────────────────────────────────────
        $title = get_the_title($post_id);
        if (empty($title)) {
            $title = $post->post_title;
        }

        // ─── Content (stripped of HTML) ───────────────────────
        $content = wp_strip_all_tags(
            apply_filters('the_content', $post->post_content),
            true
        );
        $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $content = preg_replace('/\s+/', ' ', $content);
        $content = trim($content);

        // ─── Excerpt ─────────────────────────────────────────
        $excerpt = '';
        if (!empty($post->post_excerpt)) {
            $excerpt = wp_strip_all_tags($post->post_excerpt, true);
        } else {
            $excerpt_text = get_the_excerpt($post_id);
            if (!empty($excerpt_text) && $excerpt_text !== $title) {
                $excerpt = wp_strip_all_tags($excerpt_text, true);
            }
        }

        // ─── Permalink ───────────────────────────────────────
        $permalink = get_permalink($post_id);
        if (empty($permalink)) {
            $permalink = '';
        }

        // ─── Post Date (ISO 8601) ────────────────────────────
        $post_date = $post->post_date_gmt
            ? $post->post_date_gmt
            : $post->post_date;

        // ─── Thumbnail ───────────────────────────────────────
        $thumbnail_url = '';
        if (has_post_thumbnail($post_id)) {
            $thumbnail_url = get_the_post_thumbnail_url($post_id, 'large');
        }

        // ─── Categories (from registered taxonomies) ─────────
        $categories = [];
        $taxonomies = get_object_taxonomies($post->post_type, 'names');
        foreach ($taxonomies as $tax) {
            if (in_array($tax, ['category', 'post_tag'], true) || strpos($tax, 'category') !== false) {
                $terms = wp_get_post_terms($post_id, $tax, ['fields' => 'names']);
                if (!is_wp_error($terms) && !empty($terms)) {
                    $categories = array_merge($categories, $terms);
                }
            }
        }
        $categories = array_values(array_unique($categories));

        // ─── Tags ────────────────────────────────────────────
        $tags = [];
        $post_tags = wp_get_post_tags($post_id, ['fields' => 'names']);
        if (!is_wp_error($post_tags) && !empty($post_tags)) {
            $tags = (array) $post_tags;
        }

        // ─── Build the document ──────────────────────────────
        $document = [
            'id'            => (string) $post_id,
            'post_title'    => $title,
            'post_content'  => $content,
            'post_excerpt'  => $excerpt,
            'permalink'     => $permalink,
            'post_date'     => $post_date,
            'thumbnail_url' => $thumbnail_url,
            'post_type'     => $post->post_type,
            'categories'    => $categories,
            'tags'          => $tags,
        ];

        /**
         * Filter the document fields before sending to AACsearch.
         *
         * Allows plugins and themes to add custom fields (e.g. ACF, meta)
         * to the document sent to the AACsearch index.
         *
         * @since 1.0.0
         *
         * @param array   $document The document array.
         * @param WP_Post $post     The WordPress post object.
         */
        return apply_filters('aacsearch_document_fields', $document, $post);
    }

    /**
     * Log an error message to the AACsearch debug log.
     *
     * @param string $message Error message.
     */
    protected function log_error($message)
    {
        $log = get_option('aacsearch_debug_log', []);
        if (!is_array($log)) {
            $log = [];
        }

        $log[] = [
            'level'     => 'ERROR',
            'message'   => $message,
            'timestamp' => current_time('c'),
        ];

        // Keep only last 200 entries
        if (count($log) > 200) {
            $log = array_slice($log, -200);
        }

        update_option('aacsearch_debug_log', $log);
    }

    /**
     * Verify connection credentials by performing a handshake.
     *
     * @return bool True if handshake succeeded.
     */
    public function verify_connection()
    {
        try {
            return $this->getClient()->handshake(AACSEARCH_SEARCH_VERSION, 'wordpress');
        } catch (Exception $e) {
            $this->log_error('Handshake failed: ' . $e->getMessage());
            return false;
        }
    }
}
