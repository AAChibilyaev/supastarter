/**
 * AACsearch WordPress Blocks — Webpack Config.
 *
 * Uses @wordpress/scripts defaults with custom entry points
 * for each AACsearch block. Outputs compiled JS to assets/js/blocks/.
 */
const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const path = require("path");

const blocksDir = path.resolve(__dirname, "blocks");
const outputDir = path.resolve(__dirname, "assets", "js", "blocks");

module.exports = {
	...defaultConfig,
	entry: {
		"search-bar": path.resolve(blocksDir, "search-bar", "index.js"),
		"instant-results": path.resolve(blocksDir, "instant-results", "index.js"),
		autocomplete: path.resolve(blocksDir, "autocomplete", "index.js"),
	},
	output: {
		path: outputDir,
		filename: "[name].js",
	},
};
