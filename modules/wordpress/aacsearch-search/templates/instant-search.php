<?php
/**
 * AACsearch Instant Search Template
 *
 * Overridable template for the [aacsearch_search] shortcode.
 * Copy this file to /wp-content/themes/your-theme/aacsearch/instant-search.php
 * to customize the HTML markup.
 *
 * Available variables:
 *   $aacsearch_config (array) — Shortcode config: postTypes, perPage, showFilter, showSortBy, columns
 *
 * @since 1.0.0
 * @package AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="aacsearch-wrap"
     data-aacsearch-config="<?php echo esc_attr(wp_json_encode($aacsearch_config ?? [])); ?>">

    <div class="aacsearch-search-box">
        <input type="search"
               class="aacsearch-input"
               placeholder="<?php esc_attr_e('Search...', 'aacsearch-search'); ?>"
               autocomplete="off" />
    </div>

    <div class="aacsearch-stats"></div>

    <div class="aacsearch-layout">
        <?php if (!empty($aacsearch_config['showFilter'])) : ?>
        <div class="aacsearch-filters">
            <div class="aacsearch-filter-categories">
                <h4><?php esc_html_e('Categories', 'aacsearch-search'); ?></h4>
                <div class="aacsearch-refinement-list"></div>
            </div>
            <div class="aacsearch-filter-tags">
                <h4><?php esc_html_e('Tags', 'aacsearch-search'); ?></h4>
                <div class="aacsearch-tag-list"></div>
            </div>
        </div>
        <?php endif; ?>

        <div class="aacsearch-results"
             data-columns="<?php echo esc_attr($aacsearch_config['columns'] ?? 3); ?>">

            <?php if (!empty($aacsearch_config['showSortBy'])) : ?>
            <div class="aacsearch-sort-by">
                <select class="aacsearch-sort-select">
                    <option value="relevance"><?php esc_html_e('Most Relevant', 'aacsearch-search'); ?></option>
                    <option value="date_desc"><?php esc_html_e('Newest First', 'aacsearch-search'); ?></option>
                    <option value="date_asc"><?php esc_html_e('Oldest First', 'aacsearch-search'); ?></option>
                    <option value="title_asc"><?php esc_html_e('Title A-Z', 'aacsearch-search'); ?></option>
                    <option value="title_desc"><?php esc_html_e('Title Z-A', 'aacsearch-search'); ?></option>
                </select>
            </div>
            <?php endif; ?>

            <div class="aacsearch-hits"></div>
            <div class="aacsearch-pagination"></div>
        </div>
    </div>
</div>
