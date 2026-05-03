(function (blocks, element, blockEditor, components, i18n) {
	var el = element.createElement;
	var __ = i18n.__;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var TextControl = components.TextControl;
	var RangeControl = components.RangeControl;
	var ToggleControl = components.ToggleControl;
	var Placeholder = components.Placeholder;

	/**
	 * AACsearch Instant Results — Editor Edit Component.
	 *
	 * Renders a preview placeholder and exposes all search result
	 * configuration in the sidebar InspectorPanel.
	 */
	function InstantResultsEdit(props) {
		var attributes = props.attributes;
		var setAttributes = props.setAttributes;

		var blockProps = useBlockProps();

		return el(
			"div",
			blockProps,
			el(
				InspectorControls,
				null,
				el(
					PanelBody,
					{ title: __("Results Settings", "aacsearch-search"), initialOpen: true },
					el(TextControl, {
						label: __("Post Types", "aacsearch-search"),
						help: __(
							"Comma-separated (e.g. post,page). Empty = all configured.",
							"aacsearch-search",
						),
						value: attributes.postTypes,
						onChange: function (val) {
							setAttributes({ postTypes: val });
						},
					}),
					el(RangeControl, {
						label: __("Results Per Page", "aacsearch-search"),
						value: attributes.perPage,
						onChange: function (val) {
							setAttributes({ perPage: val });
						},
						min: 1,
						max: 100,
					}),
					el(RangeControl, {
						label: __("Grid Columns", "aacsearch-search"),
						value: attributes.columns,
						onChange: function (val) {
							setAttributes({ columns: val });
						},
						min: 1,
						max: 4,
					}),
					el(ToggleControl, {
						label: __("Show Filter Panel", "aacsearch-search"),
						checked: attributes.showFacets,
						onChange: function (val) {
							setAttributes({ showFacets: val });
						},
					}),
					el(ToggleControl, {
						label: __("Show Sort Dropdown", "aacsearch-search"),
						checked: attributes.showSort,
						onChange: function (val) {
							setAttributes({ showSort: val });
						},
					}),
				),
			),
			el(
				Placeholder,
				{
					icon: "grid-view",
					label: __("AACsearch Instant Results", "aacsearch-search"),
					instructions: __(
						"This block renders search results on the frontend. Configure options in the block sidebar.",
						"aacsearch-search",
					),
				},
				el(
					"p",
					{ className: "aacsearch-block-preview" },
					__("Per page:", "aacsearch-search") +
						" " +
						attributes.perPage +
						" | " +
						__("Columns:", "aacsearch-search") +
						" " +
						attributes.columns +
						" | " +
						__("Filters:", "aacsearch-search") +
						" " +
						(attributes.showFacets ? __("On", "aacsearch-search") : __("Off", "aacsearch-search")),
				),
			),
		);
	}

	blocks.registerBlockType("aacsearch/instant-results", {
		edit: InstantResultsEdit,
		save: function () {
			return null;
		},
	});
})(
	window.wp.blocks,
	window.wp.element,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.i18n,
);
