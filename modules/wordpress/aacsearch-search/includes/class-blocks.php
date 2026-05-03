<?php
/**
 * AACsearch Gutenberg Blocks Registration.
 *
 * Registers all AACsearch Gutenberg blocks with their render callbacks.
 * Each block's server-side rendering outputs the corresponding shortcode.
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register AACsearch Gutenberg blocks.
 */
class AACSearch_Blocks
{
    /**
     * Block namespace.
     *
     * @var string
     */
    const BLOCK_NAMESPACE = 'aacsearch';

    /**
     * Blocks directory path.
     *
     * @var string
     */
    protected static $blocks_dir = '';

    /**
     * Initialize block registration.
     */
    public static function init()
    {
        self::$blocks_dir = AACSEARCH_SEARCH_DIR . 'blocks';

        add_action('init', [self::class, 'register_blocks']);
    }

    /**
     * Register all AACsearch blocks.
     */
    public static function register_blocks()
    {
        // Bail if Gutenberg is not available
        if (!function_exists('register_block_type')) {
            return;
        }

        $blocks = [
            'search-bar'       => [self::class, 'render_search_bar'],
            'instant-results'  => [self::class, 'render_instant_results'],
            'autocomplete'     => [self::class, 'render_autocomplete'],
        ];

        foreach ($blocks as $block_name => $render_callback) {
            $block_json_path = self::$blocks_dir . '/' . $block_name . '/block.json';

            if (!file_exists($block_json_path)) {
                continue;
            }

            register_block_type($block_json_path, [
                'render_callback' => $render_callback,
            ]);
        }
    }

    /**
     * Render the AACsearch Search Bar block.
     *
     * @param array $attributes Block attributes.
     *
     * @return string HTML output.
     */
    public static function render_search_bar($attributes)
    {
        $placeholder = !empty($attributes['placeholder'])
            ? esc_attr($attributes['placeholder'])
            : __('Search...', 'aacsearch-search');

        $query_by = !empty($attributes['queryBy'])
            ? esc_attr($attributes['queryBy'])
            : 'post_title';

        return do_shortcode(
            '[aacsearch_autocomplete placeholder="' . $placeholder . '" query_by="' . $query_by . '"]'
        );
    }

    /**
     * Render the AACsearch Instant Results block.
     *
     * @param array $attributes Block attributes.
     *
     * @return string HTML output.
     */
    public static function render_instant_results($attributes)
    {
        $post_types = !empty($attributes['postTypes']) ? esc_attr($attributes['postTypes']) : '';
        $per_page   = !empty($attributes['perPage']) ? (int) $attributes['perPage'] : 10;
        $columns    = !empty($attributes['columns']) ? min(4, max(1, (int) $attributes['columns'])) : 3;
        $filter     = isset($attributes['showFacets']) && $attributes['showFacets'] ? 'show' : 'hide';
        $sortby     = isset($attributes['showSort']) && $attributes['showSort'] ? 'show' : 'hide';

        return do_shortcode(
            '[aacsearch_search'
            . ' post_types="' . $post_types . '"'
            . ' per_page="' . $per_page . '"'
            . ' columns="' . $columns . '"'
            . ' filter="' . $filter . '"'
            . ' sortby="' . $sortby . '"'
            . ']'
        );
    }

    /**
     * Render the AACsearch Autocomplete block.
     *
     * @param array $attributes Block attributes.
     *
     * @return string HTML output.
     */
    public static function render_autocomplete($attributes)
    {
        $placeholder = !empty($attributes['placeholder'])
            ? esc_attr($attributes['placeholder'])
            : __('Search...', 'aacsearch-search');

        $query_by = !empty($attributes['queryBy'])
            ? esc_attr($attributes['queryBy'])
            : 'post_title';

        return do_shortcode(
            '[aacsearch_autocomplete placeholder="' . $placeholder . '" query_by="' . $query_by . '"]'
        );
    }
}
