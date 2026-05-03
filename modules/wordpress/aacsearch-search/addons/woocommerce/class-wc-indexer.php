<?php
/**
 * AACsearch WooCommerce Product Indexer.
 *
 * Extends the base AACsearch indexer with WooCommerce-specific fields:
 * product name, SKU, price, sale_price, stock status, variations,
 * product attributes, brands, categories, and images.
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class AACSearch_WC_Indexer extends AACSearch_Indexer
{
    /**
     * Index a WooCommerce product (or variation) to AACsearch.
     *
     * Builds a product document with WC-specific fields and sends
     * it via the connector API delta sync.
     *
     * @param int $product_id Product ID.
     *
     * @return bool True on success.
     */
    public function index_product($product_id)
    {
        $product_id = (int) $product_id;
        if ($product_id <= 0) {
            return false;
        }

        $product = wc_get_product($product_id);
        if (!$product) {
            return false;
        }

        $document = $this->build_product_document($product);
        if ($document === null) {
            return false;
        }

        try {
            return $this->getClient()->deltaSync([$document]);
        } catch (Exception $e) {
            $this->log_error('Failed to index product ' . $product_id . ': ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Bulk index all WooCommerce products.
     *
     * @param int $batch_size Products per batch (default: 50).
     *
     * @return array{success: bool, indexed: int, message: string}
     */
    public function bulk_index_products($batch_size = 50)
    {
        $total_indexed = 0;
        $paged         = 1;
        $max_query     = 50000;

        try {
            while ($total_indexed < $max_query) {
                $products = wc_get_products([
                    'limit'  => $batch_size,
                    'page'   => $paged,
                    'status' => 'publish',
                    'orderby' => 'date',
                    'order'  => 'ASC',
                ]);

                if (empty($products)) {
                    break;
                }

                $batch = [];
                $variation_ids = [];

                foreach ($products as $product) {
                    $doc = $this->build_product_document($product);
                    if ($doc !== null) {
                        $batch[] = $doc;
                    }

                    // Gather variation IDs for variable products
                    if ($product->is_type('variable')) {
                        $variations = $product->get_children();
                        foreach ($variations as $vid) {
                            $variation = wc_get_product($vid);
                            if ($variation && $variation->get_status() === 'publish') {
                                $vDoc = $this->build_product_document($variation);
                                if ($vDoc !== null) {
                                    $batch[] = $vDoc;
                                }
                            }
                        }
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
                    __('WooCommerce reindex completed. %d products indexed.', 'aacsearch-search'),
                    $total_indexed
                ),
            ];
        } catch (Exception $e) {
            $this->log_error('WooCommerce bulk index failed: ' . $e->getMessage());
            return [
                'success' => false,
                'indexed' => $total_indexed,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Build a product document from a WC_Product object.
     *
     * Extends the base document schema with WooCommerce-specific
     * fields and uses the `aacsearch_document_fields` filter.
     *
     * @param WC_Product $product WooCommerce product object.
     *
     * @return array|null Document array.
     */
    public function build_product_document($product)
    {
        if (!$product) {
            return null;
        }

        $product_id = $product->get_id();
        $is_variation = $product->is_type('variation');

        // ─── Core Fields ──────────────────────────────────────
        $title = $product->get_name();
        $content = wp_strip_all_tags($product->get_description(), true);
        $short_desc = wp_strip_all_tags($product->get_short_description(), true);
        $excerpt = !empty($short_desc) ? $short_desc : $content;
        $excerpt = mb_substr($excerpt, 0, 300);

        // ─── Permalink ───────────────────────────────────────
        $permalink = get_permalink($product_id);
        if (empty($permalink)) {
            $permalink = '';
        }

        // ─── Images ──────────────────────────────────────────
        $thumbnail_url = '';
        $image_id = $product->get_image_id();
        if ($image_id) {
            $thumbnail_url = wp_get_attachment_image_url($image_id, 'large');
        } elseif (!$is_variation) {
            // For variations, use parent's thumbnail
            $parent_id = $product->get_parent_id();
            if ($parent_id) {
                $thumbnail_url = get_the_post_thumbnail_url($parent_id, 'large');
            }
        }

        if (empty($thumbnail_url)) {
            $thumbnail_url = wc_placeholder_img_src('large');
        }

        // ─── Categories ──────────────────────────────────────
        $categories = [];
        if ($is_variation) {
            $parent_id = $product->get_parent_id();
            if ($parent_id) {
                $terms = wc_get_product_category_list($parent_id);
                $categories = array_map('trim', explode(',', strip_tags($terms)));
            }
        } else {
            $terms = wp_get_post_terms($product_id, 'product_cat', ['fields' => 'names']);
            if (!is_wp_error($terms)) {
                $categories = $terms;
            }
        }

        // ─── Tags ────────────────────────────────────────────
        $tags = wp_get_post_tags($product_id, ['fields' => 'names']);
        if (is_wp_error($tags)) {
            $tags = [];
        }

        // ─── Price ───────────────────────────────────────────
        $price     = (float) $product->get_price();
        $sale_price = $product->get_sale_price()
            ? (float) $product->get_sale_price()
            : null;
        $regular_price = (float) $product->get_regular_price();

        // ─── Stock ───────────────────────────────────────────
        $stock_status = $product->get_stock_status(); // 'instock' | 'outofstock' | 'onbackorder'
        $stock_qty    = $product->get_stock_quantity();

        // ─── SKU ─────────────────────────────────────────────
        $sku = $product->get_sku() ?: '';

        // ─── Parent ID (for variations) ─────────────────────
        $parent_id = $is_variation ? $product->get_parent_id() : 0;

        // ─── Featured ────────────────────────────────────────
        $featured = $product->get_featured() ? true : false;

        // ─── Attributes ──────────────────────────────────────
        $attributes = [];
        $attrs = $product->get_attributes();

        if ($is_variation) {
            // Variation attributes
            foreach ($product->get_variation_attributes() as $name => $value) {
                $clean_name = str_replace('attribute_', '', $name);
                $attributes['attr_' . $clean_name] = $value;
            }
        } else {
            foreach ($attrs as $name => $attr_obj) {
                if (is_object($attr_obj) && method_exists($attr_obj, 'get_options')) {
                    $options = $attr_obj->get_options();
                    if (!empty($options)) {
                        $attributes['attr_' . $name] = implode(', ', $options);
                    }
                } elseif (is_string($attr_obj)) {
                    $attributes['attr_' . $name] = $attr_obj;
                }
            }
        }

        // ─── Brands (WC 9.6+ via product_cat or brand taxonomy) ──
        $brands = [];
        if (taxonomy_exists('product_brand')) {
            $brand_terms = wp_get_post_terms($product_id, 'product_brand', ['fields' => 'names']);
            if (!is_wp_error($brand_terms) && !empty($brand_terms)) {
                $brands = $brand_terms;
            }
        }

        // ─── Dates ───────────────────────────────────────────
        $post = get_post($product_id);
        $post_date = $post ? $post->post_date_gmt : current_time('mysql', true);

        // ─── Build Document ─────────────────────────────────
        $document = [
            'id'              => (string) $product_id,
            'post_title'      => $title,
            'post_content'    => $content,
            'post_excerpt'    => $excerpt,
            'permalink'       => $permalink,
            'post_date'       => $post_date,
            'thumbnail_url'   => $thumbnail_url,
            'post_type'       => 'product',
            'categories'      => $categories,
            'tags'            => $tags,
            // WooCommerce-specific
            'sku'             => $sku,
            'price'           => $price,
            'regular_price'   => $regular_price,
            'sale_price'      => $sale_price,
            'stock_status'    => $stock_status,
            'stock_quantity'  => $stock_qty,
            'featured'        => $featured,
            'parent_id'       => $parent_id,
            'brands'          => $brands,
            'attributes'      => $attributes,
            'is_variation'    => $is_variation,
            // WPML / multilingual (populated if WPML is active)
            'language'        => $this->get_product_language($product_id),
        ];

        /**
         * Filter the WooCommerce product document before sending.
         *
         * @since 1.0.0
         *
         * @param array      $document The product document array.
         * @param WC_Product $product  The WooCommerce product object.
         */
        return apply_filters('aacsearch_document_fields', $document, $post ?? null);
    }

    /**
     * Get the product language for WPML/Polylang compatibility.
     *
     * Detects the current content language using WPML's wpml_get_language_information()
     * or Polylang's pll_get_post_language(). Falls back to an empty string
     * if no multilingual plugin is active.
     *
     * @param int $product_id Product ID.
     *
     * @return string Language code (e.g. 'en', 'de', 'ru') or empty string.
     */
    protected function get_product_language($product_id)
    {
        // WPML — preferred API
        if (function_exists('wpml_get_language_information')) {
            $info = wpml_get_language_information(null, $product_id);
            if (is_array($info) && !empty($info['language_code'])) {
                return $info['language_code'];
            }
        }

        // WPML — fallback for older versions
        if (function_exists('icl_object_id') && defined('ICL_LANGUAGE_CODE')) {
            $lang_info = apply_filters('wpml_post_language_details', [], $product_id);
            if (is_array($lang_info) && !empty($lang_info['language_code'])) {
                return $lang_info['language_code'];
            }
        }

        // Polylang
        if (function_exists('pll_get_post_language')) {
            $lang = pll_get_post_language($product_id);
            if (!empty($lang)) {
                return $lang;
            }
        }

        return '';
    }
}
