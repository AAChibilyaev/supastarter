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
	 * AACsearch Autocomplete — Editor Edit Component.
	 *
	 * Renders a preview placeholder and exposes placeholder +
	 * query_by controls in the sidebar InspectorPanel.
	 */
	function AutocompleteEdit(props) {
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
					{ title: __("Autocomplete Settings", "aacsearch-search"), initialOpen: true },
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
					icon: "editor-insert-emoticon",
					label: __("AACsearch Autocomplete", "aacsearch-search"),
					instructions: __(
						"This block renders an inline autocomplete search field on the frontend. Configure options in the block sidebar.",
						"aacsearch-search",
					),
				},
				el(
					"p",
					{ className: "aacsearch-block-preview" },
					__("Placeholder:", "aacsearch-search") +
						' "' +
						attributes.placeholder +
						'" | ' +
						__("Search in:", "aacsearch-search") +
						" " +
						attributes.queryBy,
				),
			),
		);
	}

	blocks.registerBlockType("aacsearch/autocomplete", {
		edit: AutocompleteEdit,
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
