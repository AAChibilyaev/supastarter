<?php
/**
 * AACsearch Instant Search Elementor Widget.
 *
 * Adds an "AACsearch Instant Search" widget to Elementor that renders
 * the [aacsearch_search] shortcode with configurable options.
 *
 * @since      1.0.0
 * @package    AACsearch_Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class AACSearch_Elementor_Search_Widget extends \Elementor\Widget_Base
{
    /**
     * Get widget name.
     *
     * @return string
     */
    public function get_name()
    {
        return 'aacsearch_search';
    }

    /**
     * Get widget title.
     *
     * @return string
     */
    public function get_title()
    {
        return __('AACsearch Instant Search', 'aacsearch-search');
    }

    /**
     * Get widget icon.
     *
     * @return string
     */
    public function get_icon()
    {
        return 'eicon-search';
    }

    /**
     * Get widget categories.
     *
     * @return array
     */
    public function get_categories()
    {
        return ['general'];
    }

    /**
     * Register widget controls.
     */
    protected function _register_controls()
    {
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
            'label'       => __('Results Per Page', 'aacsearch-search'),
            'type'        => \Elementor\Controls_Manager::NUMBER,
            'min'         => 1,
            'max'         => 100,
            'default'     => 10,
        ]);

        $this->add_control('columns', [
            'label'       => __('Grid Columns', 'aacsearch-search'),
            'type'        => \Elementor\Controls_Manager::SELECT,
            'options'     => [
                '1' => '1',
                '2' => '2',
                '3' => '3',
                '4' => '4',
            ],
            'default'     => '3',
        ]);

        $this->add_control('show_filter', [
            'label'       => __('Show Filter Panel', 'aacsearch-search'),
            'type'        => \Elementor\Controls_Manager::SWITCHER,
            'label_on'    => __('Show', 'aacsearch-search'),
            'label_off'   => __('Hide', 'aacsearch-search'),
            'return_value' => 'show',
            'default'     => 'show',
        ]);

        $this->add_control('show_sortby', [
            'label'       => __('Show Sort By Dropdown', 'aacsearch-search'),
            'type'        => \Elementor\Controls_Manager::SWITCHER,
            'label_on'    => __('Show', 'aacsearch-search'),
            'label_off'   => __('Hide', 'aacsearch-search'),
            'return_value' => 'show',
            'default'     => 'show',
        ]);

        $this->end_controls_section();
    }

    /**
     * Render the widget output.
     */
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
