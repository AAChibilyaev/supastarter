<?php
/**
 * AACsearch Elementor Widgets.
 *
 * Elementor widgets for embedding AACsearch instant search
 * and autocomplete in pages built with Elementor.
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Registers the AACsearch Elementor widgets.
 *
 * Hook this into 'elementor/widgets/register'.
 *
 * @param \Elementor\Widgets_Manager $widgets_manager Elementor widgets manager.
 */
function aacsearch_register_elementor_widgets($widgets_manager)
{
    // Only load if Elementor is active
    if (!did_action('elementor/loaded')) {
        return;
    }

    // Include widget classes
    require_once AACSEARCH_SEARCH_DIR . 'includes/class-elementor-search-widget.php';
    require_once AACSEARCH_SEARCH_DIR . 'includes/class-elementor-autocomplete-widget.php';

    $widgets_manager->register(new AACSearch_Elementor_Search_Widget());
    $widgets_manager->register(new AACSearch_Elementor_Autocomplete_Widget());
}

add_action('elementor/widgets/register', 'aacsearch_register_elementor_widgets');
