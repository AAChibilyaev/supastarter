<?php
/**
 * AACsearch Autocomplete Elementor Widget.
 *
 * Adds an "AACsearch Autocomplete" widget to Elementor that renders
 * the [aacsearch_autocomplete] shortcode with configurable options.
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class AACSearch_Elementor_Autocomplete_Widget extends \Elementor\Widget_Base
{
    public function get_name()
    {
        return 'aacsearch_autocomplete';
    }

    public function get_title()
    {
        return __('AACsearch Autocomplete', 'aacsearch-search');
    }

    public function get_icon()
    {
        return 'eicon-site-search';
    }

    public function get_categories()
    {
        return ['general', 'aacsearch'];
    }

    public function get_keywords()
    {
        return ['search', 'autocomplete', 'aacsearch', 'typeahead', 'suggest'];
    }

    protected function register_controls()
    {
        $this->start_controls_section('content_section', [
            'label' => __('Autocomplete Settings', 'aacsearch-search'),
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('placeholder', [
            'label'       => __('Placeholder Text', 'aacsearch-search'),
            'type'        => \Elementor\Controls_Manager::TEXT,
            'default'     => __('Search...', 'aacsearch-search'),
        ]);

        $this->add_control('query_by', [
            'label'       => __('Search Field', 'aacsearch-search'),
            'type'        => \Elementor\Controls_Manager::SELECT,
            'options'     => [
                'post_title'   => __('Title', 'aacsearch-search'),
                'post_content' => __('Content', 'aacsearch-search'),
                'post_title,post_content' => __('Title + Content', 'aacsearch-search'),
            ],
            'default'     => 'post_title',
        ]);

        $this->end_controls_section();
    }

    protected function render()
    {
        $settings = $this->get_settings_for_display();

        $placeholder = !empty($settings['placeholder']) ? $settings['placeholder'] : __('Search...', 'aacsearch-search');
        $query_by    = !empty($settings['query_by']) ? $settings['query_by'] : 'post_title';

        echo do_shortcode('[aacsearch_autocomplete'
            . ' placeholder="' . esc_attr($placeholder) . '"'
            . ' query_by="' . esc_attr($query_by) . '"'
            . ']');
    }
}
