<?php
/**
 * AACsearch Frontend — Instant Search UI, Shortcodes, and Overrides.
 *
 * Handles the public-facing instant search experience:
 * - [aacsearch_search] shortcode with configurable filters and sorting
 * - [aacsearch_autocomplete] shortcode for search-as-you-type popups
 * - WordPress search page override (replaces native search results)
 * - Asset enqueueing for InstantSearch.js
 * - Template overrides via theme/aacsearch/ folder
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class AACSearch_Frontend
{
    /**
     * Initialize frontend hooks.
     */
    public static function init()
    {
        $self = new self();
        $self->register_hooks();
    }

    /**
     * Register WordPress hooks.
     */
    protected function register_hooks()
    {
        // Shortcodes
        add_shortcode('aacsearch_search', [$this, 'shortcode_search']);
        add_shortcode('aacsearch_autocomplete', [$this, 'shortcode_autocomplete']);

        // Frontend asset enqueueing
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('wp_head', [$this, 'inject_search_config']);

        // Search page override
        add_action('pre_get_posts', [$this, 'override_search_page']);
    }

    /**
     * Enqueue frontend assets.
     */
    public function enqueue_assets()
    {
        // Don't enqueue on every page — only when shortcode is present or search page
        // We still register the assets so shortcode can enqueue them
        wp_register_style(
            'aacsearch-search',
            AACSEARCH_SEARCH_URL . 'assets/css/search-widget.css',
            [],
            AACSEARCH_SEARCH_VERSION
        );

        wp_register_script(
            'aacsearch-search',
            AACSEARCH_SEARCH_URL . 'assets/js/search-widget.js',
            [],
            AACSEARCH_SEARCH_VERSION,
            true
        );

        // Enqueue on search results page
        if (is_search()) {
            wp_enqueue_style('aacsearch-search');
            wp_enqueue_script('aacsearch-search');
        }
    }

    /**
     * Inject AACsearch configuration into the page head.
     */
    public function inject_search_config()
    {
        $search_key = get_option(AACSearch_Admin::OPTION_SEARCH_KEY, '');
        $index_slug = get_option(AACSearch_Admin::OPTION_INDEX_SLUG, '');
        $api_url    = get_option(AACSearch_Admin::OPTION_API_URL, '');

        if (empty($search_key) || empty($index_slug)) {
            return;
        }

        ?>
        <script>
        window.AACSEARCH_CONFIG = {
            apiUrl: <?php echo wp_json_encode(esc_url($api_url)); ?>,
            searchKey: <?php echo wp_json_encode($search_key); ?>,
            indexSlug: <?php echo wp_json_encode($index_slug); ?>
        };
        </script>
        <?php
    }

    /**
     * Override the WordPress search page with AACsearch-powered results.
     *
     * When the plugin is configured, the native search query is no longer
     * used. Instead, the search template renders the InstantSearch.js
     * container and the JS widget handles all search logic client-side.
     */
    public function override_search_page($query)
    {
        if (!is_search() || !$query->is_main_query() || is_admin()) {
            return;
        }

        $search_key = get_option(AACSearch_Admin::OPTION_SEARCH_KEY, '');
        $index_slug = get_option(AACSearch_Admin::OPTION_INDEX_SLUG, '');

        if (empty($search_key) || empty($index_slug)) {
            return;
        }

        // Tell WordPress not to run the SQL query — we handle it client-side
        $query->set('posts_per_page', -1);
        $query->set('post__in', [0]); // Returns no results — JS handles the real search
    }

    /**
     * Render the [aacsearch_search] shortcode.
     *
     * Attributes:
     *   post_types (string) — Comma-separated post types (default: all configured)
     *   per_page   (int)    — Results per page (default: 10)
     *   filter     (string) — Show filter panel: "show" | "hide" (default: "show")
     *   sortby     (string) — Show sort-by dropdown: "show" | "hide" (default: "show")
     *   columns    (int)    — Result grid columns: 1, 2, 3, 4 (default: 3)
     *
     * @param array  $atts    Shortcode attributes.
     * @param string $content Enclosed content (unused).
     *
     * @return string HTML output.
     */
    public function shortcode_search($atts, $content = '')
    {
        $search_key = get_option(AACSearch_Admin::OPTION_SEARCH_KEY, '');
        $index_slug = get_option(AACSearch_Admin::OPTION_INDEX_SLUG, '');

        if (empty($search_key) || empty($index_slug)) {
            return '<p>' . esc_html__('AACsearch is not configured.', 'aacsearch-search') . '</p>';
        }

        $atts = shortcode_atts([
            'post_types' => '',
            'per_page'   => '10',
            'filter'     => 'show',
            'sortby'     => 'show',
            'columns'    => '3',
        ], $atts);

        wp_enqueue_style('aacsearch-search');
        wp_enqueue_script('aacsearch-search');

        $config = [
            'type'      => 'search',
            'postTypes' => !empty($atts['post_types']) ? explode(',', $atts['post_types']) : [],
            'perPage'   => (int) $atts['per_page'],
            'showFilter' => $atts['filter'] === 'show',
            'showSortBy' => $atts['sortby'] === 'show',
            'columns'   => min(4, max(1, (int) $atts['columns'])),
        ];

        // Try to load overridable template first
        $template_path = $this->locate_template('instant-search.php');

        ob_start();
        if ($template_path) {
            $aacsearch_config = $config;
            include $template_path;
        } else {
            ?>
            <div class="aacsearch-wrap"
                 data-aacsearch-config="<?php echo esc_attr(wp_json_encode($config)); ?>">
                <div class="aacsearch-search-box">
                    <input type="search"
                           class="aacsearch-input"
                           placeholder="<?php esc_attr_e('Search...', 'aacsearch-search'); ?>"
                           autocomplete="off" />
                </div>
                <div class="aacsearch-stats"></div>
                <div class="aacsearch-layout">
                    <div class="aacsearch-filters" style="<?php echo $atts['filter'] === 'show' ? '' : 'display:none;'; ?>">
                        <div class="aacsearch-filter-categories">
                            <h4><?php esc_html_e('Categories', 'aacsearch-search'); ?></h4>
                            <div class="aacsearch-refinement-list"></div>
                        </div>
                        <div class="aacsearch-filter-tags">
                            <h4><?php esc_html_e('Tags', 'aacsearch-search'); ?></h4>
                            <div class="aacsearch-tag-list"></div>
                        </div>
                    </div>
                    <div class="aacsearch-results" data-columns="<?php echo (int) $atts['columns']; ?>">
                        <div class="aacsearch-sort-by" style="<?php echo $atts['sortby'] === 'show' ? '' : 'display:none;'; ?>">
                            <select class="aacsearch-sort-select">
                                <option value="relevance"><?php esc_html_e('Most Relevant', 'aacsearch-search'); ?></option>
                                <option value="date_desc"><?php esc_html_e('Newest First', 'aacsearch-search'); ?></option>
                                <option value="date_asc"><?php esc_html_e('Oldest First', 'aacsearch-search'); ?></option>
                                <option value="title_asc"><?php esc_html_e('Title A-Z', 'aacsearch-search'); ?></option>
                                <option value="title_desc"><?php esc_html_e('Title Z-A', 'aacsearch-search'); ?></option>
                            </select>
                        </div>
                        <div class="aacsearch-hits"></div>
                        <div class="aacsearch-pagination"></div>
                    </div>
                </div>
            </div>
            <?php
        }
        return ob_get_clean();
    }

    /**
     * Render the [aacsearch_autocomplete] shortcode.
     *
     * Attributes:
     *   placeholder (string) — Input placeholder text (default: "Search...")
     *   query_by    (string) — Fields to search (default: "post_title")
     *
     * @param array  $atts    Shortcode attributes.
     * @param string $content Enclosed content (unused).
     *
     * @return string HTML output.
     */
    public function shortcode_autocomplete($atts, $content = '')
    {
        $search_key = get_option(AACSearch_Admin::OPTION_SEARCH_KEY, '');
        $index_slug = get_option(AACSearch_Admin::OPTION_INDEX_SLUG, '');

        if (empty($search_key) || empty($index_slug)) {
            return '<p>' . esc_html__('AACsearch is not configured.', 'aacsearch-search') . '</p>';
        }

        $atts = shortcode_atts([
            'placeholder' => __('Search...', 'aacsearch-search'),
            'query_by'    => 'post_title',
        ], $atts);

        wp_enqueue_style('aacsearch-search');
        wp_enqueue_script('aacsearch-search');

        $config = [
            'type'        => 'autocomplete',
            'placeholder' => esc_attr($atts['placeholder']),
            'queryBy'     => $atts['query_by'],
        ];

        // Try to load overridable template first
        $template_path = $this->locate_template('autocomplete.php');

        ob_start();
        if ($template_path) {
            $aacsearch_config = $config;
            include $template_path;
        } else {
            ?>
            <div class="aacsearch-autocomplete-wrap"
                 data-aacsearch-config="<?php echo esc_attr(wp_json_encode($config)); ?>">
                <input type="search"
                       class="aacsearch-autocomplete-input"
                       placeholder="<?php echo esc_attr($atts['placeholder']); ?>"
                       autocomplete="off" />
                <div class="aacsearch-autocomplete-dropdown"></div>
            </div>
            <?php
        }
        return ob_get_clean();
    }

    /**
     * Locate a template file, checking theme override first.
     *
     * Looks in: theme/aacsearch/{template} then plugin templates/{template}
     *
     * @param string $template Template filename (e.g. 'instant-search.php').
     *
     * @return string|false Full path to template, or false if not found.
     */
    protected function locate_template($template)
    {
        // Theme override
        $theme_path = get_template_directory() . '/aacsearch/' . $template;
        if (file_exists($theme_path)) {
            return $theme_path;
        }

        // Plugin default
        $plugin_path = AACSEARCH_SEARCH_DIR . 'templates/' . $template;
        if (file_exists($plugin_path)) {
            return $plugin_path;
        }

        return false;
    }
}
