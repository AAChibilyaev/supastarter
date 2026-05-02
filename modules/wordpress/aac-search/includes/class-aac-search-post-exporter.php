<?php
/**
 * AACsearch Post/CPT Exporter for WordPress.
 *
 * Normalizes WordPress posts, pages, and custom post types into the
 * AACsearch ProductDocument schema. Supports ACF (Advanced Custom Fields)
 * via get_field(), WordPress custom fields, featured images, categories,
 * tags, custom taxonomies, and SEO metadata.
 *
 * ProductDocument schema:
 *   external_id, title, description, sku, brand, categories, category_ids,
 *   tags, price, sale_price, currency, image_url, product_url, availability,
 *   stock_quantity, attributes, locale, created_at, updated_at
 *
 * @since      1.0.0
 * @package    AACsearch
 */
if (!defined('ABSPATH')) {
	exit;
}

class AACSearch_PostExporter
{
	/**
	 * Taxonomies to include in the export.
	 *
	 * @var string[]
	 */
	protected $taxonomies;

	/**
	 * Current site locale.
	 *
	 * @var string
	 */
	protected $locale;

	/**
	 * @param string[] $taxonomies Array of taxonomy slugs to include.
	 * @param string   $locale     Site locale (e.g., 'en_US', 'ru_RU').
	 */
	public function __construct(array $taxonomies = array('category', 'post_tag'), $locale = 'en_US')
	{
		$this->taxonomies = $taxonomies;
		$this->locale     = $locale;
	}

	/**
	 * Export all posts of given types as a flat array of ProductDocument arrays.
	 *
	 * @param string[] $post_types Array of post type slugs (e.g., ['post', 'page']).
	 *
	 * @return array
	 *
	 * @throws Exception
	 */
	public function exportAll(array $post_types = array('post', 'page'))
	{
		$documents = array();
		$batches   = $this->exportBatches($post_types);

		foreach ($batches as $batch) {
			$documents = array_merge($documents, $batch);
		}

		return $documents;
	}

	/**
	 * Export posts in batches, returning an array of batches.
	 *
	 * @param string[] $post_types Array of post type slugs.
	 * @param int      $batch_size Number of posts per batch.
	 *
	 * @return array[] Array of batches, each batch is an array of ProductDocument arrays.
	 *
	 * @throws Exception
	 */
	public function exportBatches(array $post_types = array('post', 'page'), $batch_size = 50)
	{
		if (empty($post_types)) {
			return array();
		}

		$batches         = array();
		$paged           = 1;
		$max_query       = 10000; // Safety limit
		$queried         = 0;

		while ($queried < $max_query) {
			$posts = get_posts(array(
				'post_type'      => $post_types,
				'post_status'    => 'publish',
				'posts_per_page' => $batch_size,
				'paged'          => $paged,
				'orderby'        => 'ID',
				'order'          => 'ASC',
				'no_found_rows'  => true,
			));

			if (empty($posts)) {
				break;
			}

			$batch = array();
			foreach ($posts as $post) {
				$document = $this->buildDocument($post);
				if ($document !== null) {
					$batch[] = $document;
				}
			}

			if (!empty($batch)) {
				$batches[] = $batch;
			}

			$paged++;
			$queried += count($posts);
		}

		return $batches;
	}

	/**
	 * Export a single post by ID as a ProductDocument array.
	 *
	 * @param int $post_id Post ID.
	 *
	 * @return array|null ProductDocument array, or null if post not found / not published.
	 *
	 * @throws Exception
	 */
	public function exportSingle($post_id)
	{
		$post_id = (int) $post_id;
		if ($post_id <= 0) {
			return null;
		}

		$post = get_post($post_id);
		if (!$post || $post->post_status !== 'publish') {
			return null;
		}

		return $this->buildDocument($post);
	}

	/**
	 * Build a ProductDocument array from a WP_Post object.
	 *
	 * @param WP_Post $post WordPress post object.
	 *
	 * @return array|null ProductDocument array.
	 */
	public function buildDocument($post)
	{
		if (!$post || $post->post_status !== 'publish') {
			return null;
		}

		$post_id = (int) $post->ID;

		// ─── Title ──────────────────────────────────────────────
		$title = get_the_title($post_id);
		if (empty($title)) {
			$title = $post->post_title;
		}

		// ─── Description ────────────────────────────────────────
		$description = $this->cleanDescription(
			apply_filters('the_content', $post->post_content)
		);

		// ─── SKU from post meta (WooCommerce compat) ────────────
		$sku = get_post_meta($post_id, '_sku', true);
		if (empty($sku)) {
			$sku = '';
		}

		// ─── Brand (author name) ────────────────────────────────
		$author_id = (int) $post->post_author;
		$brand     = $author_id ? get_the_author_meta('display_name', $author_id) : '';

		// ─── Categories ─────────────────────────────────────────
		$categoryNames = array();
		$categoryIds   = array();
		foreach ($this->taxonomies as $tax) {
			$terms = wp_get_post_terms($post_id, $tax, array('fields' => 'all'));
			if (!is_wp_error($terms) && !empty($terms)) {
				foreach ($terms as $term) {
					$categoryNames[] = $term->name;
					$categoryIds[]   = (string) $term->term_id;
				}
			}
		}

		// ─── Tags (for 'post_tag' taxonomy specifically) ───────
		$tags = array();
		$post_tags = wp_get_post_tags($post_id, array('fields' => 'names'));
		if (!is_wp_error($post_tags) && !empty($post_tags)) {
			$tags = $post_tags;
		}

		// ─── Price (if available via meta) ──────────────────────
		$price     = (float) get_post_meta($post_id, '_price', true);
		$salePrice = (float) get_post_meta($post_id, '_sale_price', true);
		if ($salePrice <= 0) {
			$salePrice = null;
		}

		// ─── Currency (WooCommerce compat) ─────────────────────
		$currency = get_option('woocommerce_currency', 'USD');
		if (empty($currency)) {
			$currency = 'USD';
		}

		// ─── Featured Image ───────────────────────────────────
		$imageUrl = '';
		if (has_post_thumbnail($post_id)) {
			$imageUrl = get_the_post_thumbnail_url($post_id, 'large');
		}
		if (empty($imageUrl)) {
			$imageUrl = '';
		}

		// ─── Permalink ──────────────────────────────────────────
		$productUrl = get_permalink($post_id);
		if (empty($productUrl)) {
			$productUrl = '';
		}

		// ─── Availability / Stock ──────────────────────────────
		$stockQuantity = (int) get_post_meta($post_id, '_stock', true);
		$availability  = $stockQuantity > 0 ? 'in_stock' : 'out_of_stock';

		// ─── Dates ─────────────────────────────────────────────
		$createdAt = $post->post_date_gmt
			? (int) strtotime($post->post_date_gmt)
			: time();
		$updatedAt = $post->post_modified_gmt
			? (int) strtotime($post->post_modified_gmt)
			: time();

		// ─── Attributes (custom fields + ACF) ───────────────────
		$attributes = $this->buildAttributes($post_id, $post);

		// ─── Build the ProductDocument ─────────────────────────
		$document = array(
			'external_id'    => (string) $post_id,
			'title'          => $title,
			'description'    => $description,
			'sku'            => $sku,
			'brand'          => $brand,
			'categories'     => array_values(array_unique($categoryNames)),
			'category_ids'   => array_values(array_unique($categoryIds)),
			'tags'           => $tags,
			'price'          => round($price, 2),
			'sale_price'     => $salePrice !== null ? round($salePrice, 2) : null,
			'currency'       => $currency,
			'image_url'      => $imageUrl,
			'product_url'    => $productUrl,
			'availability'   => $availability,
			'stock_quantity' => $stockQuantity,
			'attributes'     => $attributes,
			'locale'         => $this->locale,
			'created_at'     => $createdAt,
			'updated_at'     => $updatedAt,
		);

		return $document;
	}

	/**
	 * Build key-value attributes from post meta, ACF fields, and post properties.
	 *
	 * @param int     $post_id Post ID.
	 * @param WP_Post $post    Post object.
	 *
	 * @return array Key-value pairs.
	 */
	protected function buildAttributes($post_id, $post)
	{
		$attrs = array();

		// Post type and status
		$attrs['post_type']   = $post->post_type;
		$attrs['post_status'] = $post->post_status;

		// Author info
		if ($post->post_author) {
			$author_id           = (int) $post->post_author;
			$attrs['author_id']  = $author_id;
			$attrs['author']     = get_the_author_meta('display_name', $author_id);
			$attrs['author_nicename'] = get_the_author_meta('user_nicename', $author_id);
		}

		// Password protected
		if (!empty($post->post_password)) {
			$attrs['password_protected'] = true;
		}

		// Post parent (for pages / hierarchical CPTs)
		if ($post->post_parent) {
			$attrs['parent_id'] = (int) $post->post_parent;
		}

		// Menu order
		if ($post->menu_order) {
			$attrs['menu_order'] = (int) $post->menu_order;
		}

		// Excerpt
		$excerpt = apply_filters('the_excerpt', get_the_excerpt($post_id));
		if (!empty($excerpt)) {
			$attrs['excerpt'] = $this->cleanDescription($excerpt);
		}

		// Slug
		$attrs['slug'] = $post->post_name;

		// Comment count
		if ($post->comment_count > 0) {
			$attrs['comment_count'] = (int) $post->comment_count;
		}

		// ─── ACF Fields (if ACF plugin is active) ─────────────
		if (function_exists('get_fields')) {
			$acf_fields = get_fields($post_id);
			if (is_array($acf_fields) && !empty($acf_fields)) {
				foreach ($acf_fields as $field_name => $field_value) {
					// Skip internal ACF fields
					if (strpos($field_name, '_') === 0) {
						continue;
					}
					$attrs['acf_' . $field_name] = $field_value;
				}
			}
		}

		// ─── Custom fields (meta) - include meaningful ones ────
		// Exclude known WordPress internal meta keys
		$excluded_meta = array(
			'_edit_lock', '_edit_last', '_wp_page_template', '_wp_attached_file',
			'_wp_attachment_metadata', '_thumbnail_id', '_product_version',
			'_sku', '_price', '_sale_price', '_stock', '_stock_status',
			'_regular_price', '_sale_price_dates_from', '_sale_price_dates_to',
			'_wc_rating_count', '_wc_review_count', '_wc_average_rating',
			'_tax_class', '_tax_status', '_downloadable', '_virtual',
			'_manage_stock', '_backorders', '_sold_individually',
			'_weight', '_length', '_width', '_height', '_shipping_class_id',
		);

		// Only include non-empty, non-excluded meta
		$all_meta = get_post_meta($post_id);
		if (is_array($all_meta)) {
			foreach ($all_meta as $meta_key => $meta_values) {
				// Skip ACF internal keys (already handled above)
				if (strpos($meta_key, '_') === 0 && !function_exists('get_fields')) {
					continue;
				}
				if (in_array($meta_key, $excluded_meta, true)) {
					continue;
				}
				if (strpos($meta_key, 'acf_') === 0) {
					continue;
				}
				$value = maybe_unserialize($meta_values[0]);
				// Only include scalar values (skip serialized arrays for safety)
				if (is_scalar($value) && $value !== '' && $value !== false) {
					$attrs['meta_' . $meta_key] = $value;
				}
			}
		}

		return $attrs;
	}

	/**
	 * Strip HTML tags and normalize whitespace from a description string.
	 *
	 * @param string $description Raw HTML description.
	 *
	 * @return string Clean plain text.
	 */
	protected function cleanDescription($description)
	{
		$text = wp_strip_all_tags($description, true);
		$text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
		$text = preg_replace('/\s+/', ' ', $text);
		$text = trim($text);

		return $text;
	}
}
