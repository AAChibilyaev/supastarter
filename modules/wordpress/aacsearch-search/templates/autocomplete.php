<?php
/**
 * AACsearch Autocomplete Template
 *
 * Overridable template for the [aacsearch_autocomplete] shortcode.
 * Copy this file to /wp-content/themes/your-theme/aacsearch/autocomplete.php
 * to customize the HTML markup.
 *
 * Available variables:
 *   $aacsearch_config (array) — Shortcode config: placeholder, queryBy
 *
 * @since 1.0.0
 * @package AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="aacsearch-autocomplete-wrap"
     data-aacsearch-config="<?php echo esc_attr(wp_json_encode($aacsearch_config ?? [])); ?>">
    <input type="search"
           class="aacsearch-autocomplete-input"
           placeholder="<?php echo esc_attr($aacsearch_config['placeholder'] ?? __('Search...', 'aacsearch-search')); ?>"
           autocomplete="off" />
    <div class="aacsearch-autocomplete-dropdown"></div>
</div>
