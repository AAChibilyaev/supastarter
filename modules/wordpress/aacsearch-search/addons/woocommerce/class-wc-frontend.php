<?php
/**
 * AACsearch WooCommerce Frontend — Search Override and Filters.
 *
 * Replaces the WooCommerce search results page with AACsearch-powered
 * instant search, adding price range, stock, brand, and category filters.
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class AACSearch_WC_Frontend
{
    /**
     * Initialize WC frontend hooks.
     */
    public static function init()
    {
        $self = new self();
        $self->register_hooks();
    }

    /**
     * Register WooCommerce-specific hooks.
     */
    protected function register_hooks()
    {
        // Override WC search results page
        add_action('pre_get_posts', [$this, 'override_wc_search'], 20);

        // Enqueue WC-specific styles
        add_action('wp_enqueue_scripts', [$this, 'enqueue_wc_assets']);

        // Inject WC-specific config for the JS widget
        add_action('wp_head', [$this, 'inject_wc_config']);

        // Product sync hooks
        add_action('woocommerce_update_product', [$this, 'on_product_update'], 10, 1);
        add_action('woocommerce_new_product', [$this, 'on_product_update'], 10, 1);
        add_action('woocommerce_trash_product', [$this, 'on_product_delete'], 10, 1);
        add_action('woocommerce_delete_product', [$this, 'on_product_delete'], 10, 1);
        add_action('woocommerce_product_object_updated_props', [$this, 'on_stock_change'], 10, 2);
    }

    /**
     * Override WooCommerce search page to use AACsearch.
     *
     * When a WC search is detected, prevents the native query
     * from running (the JS widget handles search client-side).
     *
     * @param WP_Query $query The main query.
     */
    public function override_wc_search($query)
    {
        if (!is_admin() && $query->is_main_query() && $query->is_search()) {
            // Check if WooCommerce is active and this is a product search
            if (function_exists('WC') && (isset($_GET['post_type']) && $_GET['post_type'] === 'product')) {
                $query->set('posts_per_page', -1);
                $query->set('post__in', [0]);
            }
        }
    }

    /**
     * Enqueue WC-specific CSS for price slider and stock filters.
     */
    public function enqueue_wc_assets()
    {
        if (!is_search() && !has_shortcode(get_post()->post_content ?? '', 'aacsearch_search')) {
            return;
        }

        wp_add_inline_style('aacsearch-search', '
            .aacsearch-price-range {
                margin-bottom: 20px;
            }
            .aacsearch-price-range h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #555;
            }
            .aacsearch-price-inputs {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .aacsearch-price-inputs input[type="number"] {
                width: 80px;
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 13px;
            }
            .aacsearch-price-inputs button {
                padding: 6px 12px;
                background: #6366f1;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
            }
            .aacsearch-price-inputs button:hover {
                background: #4f46e5;
            }
            .aacsearch-stock-filter {
                margin-bottom: 20px;
            }
            .aacsearch-stock-filter h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #555;
            }
            .aacsearch-stock-filter label {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 0;
                font-size: 14px;
                cursor: pointer;
            }
            .aacsearch-stock-filter input[type="checkbox"] {
                accent-color: #6366f1;
            }
            .aacsearch-brand-filter {
                margin-bottom: 20px;
            }
            .aacsearch-brand-filter h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #555;
            }
            .aacsearch-brand-filter label {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 0;
                font-size: 14px;
                cursor: pointer;
            }
            .aacsearch-brand-filter input[type="checkbox"] {
                accent-color: #6366f1;
            }
            .aacsearch-wc-price {
                font-size: 16px;
                font-weight: 700;
                color: #059669;
            }
            .aacsearch-wc-regular-price {
                font-size: 13px;
                color: #9ca3af;
                text-decoration: line-through;
                margin-left: 6px;
            }
            .aacsearch-wc-stock {
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 4px;
                font-weight: 600;
            }
            .aacsearch-wc-stock.instock { background: #d1fae5; color: #065f46; }
            .aacsearch-wc-stock.outofstock { background: #fee2e2; color: #991b1b; }
            .aacsearch-wc-stock.onbackorder { background: #fef3c7; color: #92400e; }
        ');
    }

    /**
     * Inject WooCommerce-specific config for the JS widget.
     */
    public function inject_wc_config()
    {
        if (!is_search() && !has_shortcode(get_post()->post_content ?? '', 'aacsearch_search')) {
            return;
        }

        ?>
        <script>
        (function() {
            var cfg = window.AACSEARCH_CONFIG || {};
            cfg.woocommerce = {
                enabled: true,
                currency: <?php echo wp_json_encode(get_woocommerce_currency_symbol()); ?>,
                priceRangeMin: 0,
                priceRangeMax: 99999
            };
            window.AACSEARCH_CONFIG = cfg;
        })();
        </script>
        <?php
    }

    /**
     * Handle product update — sync to AACsearch.
     *
     * @param int $product_id Product ID.
     */
    public function on_product_update($product_id)
    {
        if (!function_exists('WC') || !$product_id) {
            return;
        }

        $api_url       = get_option(AACSearch_Admin::OPTION_API_URL, '');
        $connector_key = get_option(AACSearch_Admin::OPTION_CONNECTOR_KEY, '');
        $index_slug    = get_option(AACSearch_Admin::OPTION_INDEX_SLUG, '');

        if (empty($api_url) || empty($connector_key) || empty($index_slug)) {
            return;
        }

        $wc_indexer = new AACSearch_WC_Indexer($api_url, $connector_key, $index_slug);
        $wc_indexer->index_product($product_id);

        // If variable product, also sync variations
        $product = wc_get_product($product_id);
        if ($product && $product->is_type('variable')) {
            $variations = $product->get_children();
            foreach ($variations as $vid) {
                $wc_indexer->index_product($vid);
            }
        }
    }

    /**
     * Handle product deletion — remove from AACsearch.
     *
     * @param int $product_id Product ID.
     */
    public function on_product_delete($product_id)
    {
        if (!function_exists('WC') || !$product_id) {
            return;
        }

        $api_url       = get_option(AACSearch_Admin::OPTION_API_URL, '');
        $connector_key = get_option(AACSearch_Admin::OPTION_CONNECTOR_KEY, '');
        $index_slug    = get_option(AACSearch_Admin::OPTION_INDEX_SLUG, '');

        if (empty($api_url) || empty($connector_key) || empty($index_slug)) {
            return;
        }

        $wc_indexer = new AACSearch_WC_Indexer($api_url, $connector_key, $index_slug);
        $wc_indexer->delete_post($product_id);
    }

    /**
     * Handle stock changes — sync updated products.
     *
     * @param WC_Product $product    The product that was updated.
     * @param array      $updated_props Array of updated property names.
     */
    public function on_stock_change($product, $updated_props)
    {
        if (!in_array('stock_status', (array) $updated_props, true)
            && !in_array('stock_quantity', (array) $updated_props, true)) {
            return;
        }

        $this->on_product_update($product->get_id());
    }
}
