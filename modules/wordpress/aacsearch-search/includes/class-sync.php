<?php
/**
 * AACsearch Real-time Sync for WordPress.
 *
 * Hooks into WordPress post lifecycle events to automatically
 * index or delete documents in AACsearch. Uses wp_schedule_single_event
 * for async processing to avoid blocking the HTTP request.
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class AACSearch_Sync
{
    /**
     * Action hook name for async index events.
     */
    const ASYNC_INDEX_HOOK  = 'aacsearch_async_index_post';

    /**
     * Action hook name for async delete events.
     */
    const ASYNC_DELETE_HOOK = 'aacsearch_async_delete_post';

    /**
     * Indexer instance.
     *
     * @var AACSearch_Indexer
     */
    protected $indexer;

    /**
     * Whether sync is enabled.
     *
     * @var bool
     */
    protected $enabled;

    /**
     * @param AACSearch_Indexer $indexer Indexer instance.
     * @param bool              $enabled Whether sync is currently enabled.
     */
    public function __construct(AACSearch_Indexer $indexer, $enabled = true)
    {
        $this->indexer = $indexer;
        $this->enabled = $enabled;
    }

    /**
     * Register all WordPress hooks for real-time sync.
     *
     * Call this during plugin initialization to activate
     * real-time sync behavior.
     */
    public function register_hooks()
    {
        if (!$this->enabled) {
            return;
        }

        // ─── Post Save/Update ─────────────────────────────────
        // save_post fires after a post is saved to the database.
        // $post_id, $post (WP_Post), $update (bool)
        add_action('save_post', [$this, 'on_post_save'], 10, 3);

        // ─── Post Delete ─────────────────────────────────────
        // before_delete_post fires before a post is permanently deleted.
        add_action('before_delete_post', [$this, 'on_post_delete'], 10, 1);

        // ─── Post Trash ──────────────────────────────────────
        // wp_trash_post fires when a post is sent to trash.
        add_action('wp_trash_post', [$this, 'on_post_delete'], 10, 1);

        // ─── Async Handlers ──────────────────────────────────
        // Register handlers for scheduled single events.
        add_action(self::ASYNC_INDEX_HOOK, [$this, 'handle_async_index'], 10, 1);
        add_action(self::ASYNC_DELETE_HOOK, [$this, 'handle_async_delete'], 10, 1);
    }

    /**
     * Handle post save/update event.
     *
     * Schedules an async event to index the post in AACsearch.
     * Skips autosaves, revisions, and non-public post types.
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

        // Skip if post type is not publicly viewable
        $post_type = get_post_type($post_id);
        if (!$post_type || !is_post_type_viewable($post_type)) {
            return;
        }

        // Skip if not published (drafts, pending, etc.)
        $status = get_post_status($post_id);
        if ($status !== 'publish') {
            return;
        }

        // Schedule async index (debounced: replace any existing scheduled event)
        $this->schedule_async(self::ASYNC_INDEX_HOOK, $post_id);
    }

    /**
     * Handle post delete/trash event.
     *
     * Schedules an async event to delete the document from AACsearch.
     *
     * @param int $post_id Post ID.
     */
    public function on_post_delete($post_id)
    {
        // Skip if post type is not publicly viewable
        $post_type = get_post_type($post_id);
        if (!$post_type || !is_post_type_viewable($post_type)) {
            return;
        }

        // Schedule async delete
        $this->schedule_async(self::ASYNC_DELETE_HOOK, $post_id);
    }

    /**
     * Handle async post index event.
     *
     * Called by wp-cron when the scheduled single event fires.
     *
     * @param int $post_id Post ID to index.
     */
    public function handle_async_index($post_id)
    {
        $this->indexer->index_post($post_id);
    }

    /**
     * Handle async post delete event.
     *
     * Called by wp-cron when the scheduled single event fires.
     *
     * @param int $post_id Post ID to delete from AACsearch.
     */
    public function handle_async_delete($post_id)
    {
        $this->indexer->delete_post($post_id);
    }

    /**
     * Schedule a single async event for a post action.
     *
     * Uses wp_schedule_single_event which is debounced by WordPress:
     * if a pending event with the same hook + args already exists,
     * it won't be duplicated. This prevents race conditions on
     * rapid consecutive saves.
     *
     * @param string $hook    Action hook name.
     * @param int    $post_id Post ID.
     */
    protected function schedule_async($hook, $post_id)
    {
        if (!wp_next_scheduled($hook, [$post_id])) {
            wp_schedule_single_event(time(), $hook, [$post_id]);
        }
    }
}
