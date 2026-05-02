<?php
/**
 * AACsearch Taxonomy Exporter for WordPress.
 *
 * Normalizes WordPress taxonomy terms (categories, tags, custom taxonomies)
 * into the AACsearch ProductDocument schema for indexing.
 *
 * @since      1.0.0
 * @package    AACsearch
 */
if (!defined('ABSPATH')) {
	exit;
}

class AACSearch_TaxonomyExporter
{
	/**
	 * AACsearch API client instance.
	 *
	 * @var AACSearch_Client
	 */
	protected $client;

	/**
	 * Taxonomies to export.
	 *
	 * @var string[]
	 */
	protected $taxonomies;

	/**
	 * @param AACSearch_Client $client    API client instance.
	 * @param string[]         $taxonomies Array of taxonomy slugs.
	 */
	public function __construct(AACSearch_Client $client, array $taxonomies = array('category', 'post_tag'))
	{
		$this->client    = $client;
		$this->taxonomies = $taxonomies;
	}

	/**
	 * Export all terms from configured taxonomies as a flat array.
	 *
	 * @return array Array of ProductDocument arrays.
	 */
	public function exportAll()
	{
		$documents = array();
		$batches   = $this->exportBatches();

		foreach ($batches as $batch) {
			$documents = array_merge($documents, $batch);
		}

		return $documents;
	}

	/**
	 * Export taxonomy terms in batches.
	 *
	 * @param int $batch_size Number of terms per batch.
	 *
	 * @return array[] Array of batches.
	 */
	public function exportBatches($batch_size = 50)
	{
		$batches = array();

		foreach ($this->taxonomies as $taxonomy) {
			$terms = get_terms(array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => false,
				'orderby'    => 'term_id',
				'order'      => 'ASC',
			));

			if (is_wp_error($terms) || empty($terms)) {
				continue;
			}

			$batch = array();
			foreach ($terms as $term) {
				$document = $this->buildDocument($term, $taxonomy);
				if ($document !== null) {
					$batch[] = $document;
				}

				if (count($batch) >= $batch_size) {
					$batches[] = $batch;
					$batch     = array();
				}
			}

			if (!empty($batch)) {
				$batches[] = $batch;
			}
		}

		return $batches;
	}

	/**
	 * Export a single term by ID as a ProductDocument array.
	 *
	 * @param int    $term_id  Term ID.
	 * @param string $taxonomy Taxonomy slug.
	 *
	 * @return array|null ProductDocument array, or null if term not found.
	 */
	public function exportSingle($term_id, $taxonomy)
	{
		$term = get_term((int) $term_id, $taxonomy);
		if (is_wp_error($term) || !$term) {
			return null;
		}

		return $this->buildDocument($term, $taxonomy);
	}

	/**
	 * Build a ProductDocument array from a WP_Term object.
	 *
	 * @param WP_Term $term     Term object.
	 * @param string  $taxonomy Taxonomy slug.
	 *
	 * @return array|null ProductDocument array.
	 */
	public function buildDocument($term, $taxonomy)
	{
		if (!$term || is_wp_error($term)) {
			return null;
		}

		// Build the hierarchy path (parent > child > grandchild)
		$hierarchy = $this->getTermHierarchy($term->term_id, $taxonomy);

		// Get post count for this term
		$postCount = (int) $term->count;

		// Term description
		$description = '';
		if (!empty($term->description)) {
			$description = wp_strip_all_tags($term->description, true);
		}

		// Build attributes
		$attributes = array(
			'type'         => 'taxonomy_term',
			'taxonomy'     => $taxonomy,
			'taxonomy_label' => $this->getTaxonomyLabel($taxonomy),
			'slug'         => $term->slug,
			'term_group'   => (int) $term->term_group,
			'parent_id'    => (int) $term->parent,
			'post_count'   => $postCount,
		);

		// Add parent name if exists
		if ($term->parent) {
			$parent = get_term($term->parent, $taxonomy);
			if ($parent && !is_wp_error($parent)) {
				$attributes['parent_name'] = $parent->name;
			}
		}

		// ACF fields for terms
		if (function_exists('get_fields')) {
			$acf_fields = get_fields('term_' . $term->term_id);
			if (is_array($acf_fields) && !empty($acf_fields)) {
				foreach ($acf_fields as $field_name => $field_value) {
					if (strpos($field_name, '_') === 0) {
						continue;
					}
					$attributes['acf_' . $field_name] = $field_value;
				}
			}
		}

		$document = array(
			'external_id'    => $taxonomy . '_' . $term->term_id,
			'title'          => $term->name,
			'description'    => $description,
			'sku'            => '',
			'brand'          => '',
			'categories'     => $hierarchy,
			'category_ids'   => array_map('strval', $this->getTermIdHierarchy($term->term_id, $taxonomy)),
			'tags'           => array($taxonomy),
			'price'          => 0,
			'sale_price'     => null,
			'currency'       => '',
			'image_url'      => '',
			'product_url'    => get_term_link($term, $taxonomy),
			'availability'   => 'in_stock',
			'stock_quantity' => -1,
			'attributes'     => $attributes,
			'locale'         => get_locale(),
			'created_at'     => time(),
			'updated_at'     => time(),
		);

		return $document;
	}

	/**
	 * Get the hierarchical path for a term (parent > child).
	 *
	 * @param int    $term_id  Term ID.
	 * @param string $taxonomy Taxonomy slug.
	 *
	 * @return string[]
	 */
	protected function getTermHierarchy($term_id, $taxonomy)
	{
		$names = array();
		$ancestors = get_ancestors($term_id, $taxonomy, 'taxonomy');
		$ancestors = array_reverse($ancestors);

		foreach ($ancestors as $ancestor_id) {
			$ancestor = get_term($ancestor_id, $taxonomy);
			if ($ancestor && !is_wp_error($ancestor)) {
				$names[] = $ancestor->name;
			}
		}

		// Add the term itself
		$term = get_term($term_id, $taxonomy);
		if ($term && !is_wp_error($term)) {
			$names[] = $term->name;
		}

		return $names;
	}

	/**
	 * Get the hierarchical term IDs (ancestors + self).
	 *
	 * @param int    $term_id  Term ID.
	 * @param string $taxonomy Taxonomy slug.
	 *
	 * @return int[]
	 */
	protected function getTermIdHierarchy($term_id, $taxonomy)
	{
		$ids = get_ancestors($term_id, $taxonomy, 'taxonomy');
		$ids = array_reverse($ids);
		$ids[] = (int) $term_id;

		return $ids;
	}

	/**
	 * Get the human-readable label for a taxonomy.
	 *
	 * @param string $taxonomy Taxonomy slug.
	 *
	 * @return string
	 */
	protected function getTaxonomyLabel($taxonomy)
	{
		$tax_obj = get_taxonomy($taxonomy);
		if ($tax_obj) {
			return $tax_obj->labels->singular_name;
		}

		return $taxonomy;
	}
}
