<?php
/**
 * AACsearch Instant Search Elementor Widget.
 *
 * Adds an "AACsearch Instant Search" widget to Elementor that renders
 * the [aacsearch_search] shortcode with configurable options and style controls.
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class AACSearch_Elementor_Search_Widget extends \Elementor\Widget_Base
{
    public function get_name()
    {
        return 'aacsearch_search';
    }

    public function get_title()
    {
        return __('AACsearch Instant Search', 'aacsearch-search');
    }

    public function get_icon()
    {
        return 'eicon-search';
    }

    public function get_categories()
    {
        return ['general', 'aacsearch'];
    }

    public function get_keywords()
    {
        return ['search', 'aacsearch', 'instant search', 'ajax'];
    }

    protected function register_controls()
    {
        // ─── Content Tab ──────────────────────────────────────

        $this->start_controls_section('content_section', [
            'label' => __('Search Settings', 'aacsearch-search'),
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('post_types', [
            'label'       => __('Post Types', 'aacsearch-search'),
            'type'        => \Elementor\Controls_Manager::TEXT,
            'description' => __('Comma-separated list of post types (e.g. post,page). Leave empty for all configured.', 'aacsearch-search'),
            'default'     => '',
        ]);

        $this->add_control('per_page', [
            'label'   => __('Results Per Page', 'aacsearch-search'),
            'type'    => \Elementor\Controls_Manager::NUMBER,
            'min'     => 1,
            'max'     => 100,
            'default' => 10,
        ]);

        $this->add_control('columns', [
            'label'   => __('Grid Columns', 'aacsearch-search'),
            'type'    => \Elementor\Controls_Manager::SELECT,
            'options' => [
                '1' => '1',
                '2' => '2',
                '3' => '3',
                '4' => '4',
            ],
            'default' => '3',
        ]);

        $this->add_control('show_filter', [
            'label'        => __('Show Filter Panel', 'aacsearch-search'),
            'type'         => \Elementor\Controls_Manager::SWITCHER,
            'label_on'     => __('Show', 'aacsearch-search'),
            'label_off'    => __('Hide', 'aacsearch-search'),
            'return_value' => 'show',
            'default'      => 'show',
        ]);

        $this->add_control('show_sortby', [
            'label'        => __('Show Sort By Dropdown', 'aacsearch-search'),
            'type'         => \Elementor\Controls_Manager::SWITCHER,
            'label_on'     => __('Show', 'aacsearch-search'),
            'label_off'    => __('Hide', 'aacsearch-search'),
            'return_value' => 'show',
            'default'      => 'show',
        ]);

        $this->end_controls_section();

        // ─── Style Tab ────────────────────────────────────────

        $this->start_controls_section('style_section', [
            'label' => __('Search Box', 'aacsearch-search'),
            'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
        ]);

        $this->add_control('accent_color', [
            'label'     => __('Accent Color', 'aacsearch-search'),
            'type'      => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .aacsearch-page-active' => 'background: {{VALUE}}; border-color: {{VALUE}};',
                '{{WRAPPER}} .aacsearch-hit-title a:hover' => 'color: {{VALUE}};',
                '{{WRAPPER}} .aacsearch-input:focus' => 'border-color: {{VALUE}};',
            ],
            'default' => '#6366f1',
        ]);

        $this->end_controls_section();
    }

    protected function render()
    {
        $settings = $this->get_settings_for_display();

        $post_types = !empty($settings['post_types']) ? $settings['post_types'] : '';
        $per_page   = !empty($settings['per_page']) ? (int) $settings['per_page'] : 10;
        $columns    = !empty($settings['columns']) ? $settings['columns'] : '3';
        $filter     = !empty($settings['show_filter']) ? $settings['show_filter'] : 'show';
        $sortby     = !empty($settings['show_sortby']) ? $settings['show_sortby'] : 'show';

        echo do_shortcode('[aacsearch_search'
            . ' post_types="' . esc_attr($post_types) . '"'
            . ' per_page="' . (int) $per_page . '"'
            . ' columns="' . esc_attr($columns) . '"'
            . ' filter="' . esc_attr($filter) . '"'
            . ' sortby="' . esc_attr($sortby) . '"'
            . ']');
    }
}
