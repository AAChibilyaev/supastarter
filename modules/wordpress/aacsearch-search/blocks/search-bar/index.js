(function (blocks, element, blockEditor, components, i18n) {
	var el = element.createElement;
	var __ = i18n.__;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var TextControl = components.TextControl;
	var SelectControl = components.SelectControl;
	var Placeholder = components.Placeholder;

	/**
	 * AACsearch Search Bar — Editor Edit Component.
	 *
	 * Renders a preview in the editor and exposes placeholder +
	 * query_by controls in the sidebar InspectorPanel.
	 */
	function SearchBarEdit(props) {
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
					{ title: __("Search Bar Settings", "aacsearch-search"), initialOpen: true },
					el(TextControl, {
						label: __("Placeholder Text", "aacsearch-search"),
						value: attributes.placeholder,
						onChange: function (val) {
							setAttributes({ placeholder: val });
						},
					}),
					el(SelectControl, {
						label: __("Search Field", "aacsearch-search"),
						value: attributes.queryBy,
						options: [
							{ label: __("Title", "aacsearch-search"), value: "post_title" },
							{ label: __("Content", "aacsearch-search"), value: "post_content" },
							{
								label: __("Title + Content", "aacsearch-search"),
								value: "post_title,post_content",
							},
						],
						onChange: function (val) {
							setAttributes({ queryBy: val });
						},
					}),
				),
			),
			el(
				Placeholder,
				{
					icon: "search",
					label: __("AACsearch Search Bar", "aacsearch-search"),
					instructions: __(
						"This block renders a search input bar on the frontend. Configure options in the block sidebar.",
						"aacsearch-search",
					),
				},
				el(
					"p",
					{ className: "aacsearch-block-preview" },
					__("Search placeholder:", "aacsearch-search") +
						' "' +
						attributes.placeholder +
						'"',
				),
			),
		);
	}

	blocks.registerBlockType("aacsearch/search-bar", {
		edit: SearchBarEdit,
		save: function () {
			// Dynamic block — rendered server-side via render_callback
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
