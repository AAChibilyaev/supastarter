/**
 * AACsearch plugin admin panel — React components.
 * Registers the plugin settings page in Strapi admin.
 */

import type { StrapiApp } from "@strapi/strapi/admin";

export default {
	register(app: StrapiApp) {
		app.addMenuLink({
			to: "/plugins/aacsearch",
			icon: "search",
			intlLabel: {
				id: "aacsearch.plugin.name",
				defaultMessage: "AACsearch Sync",
			},
			Component: () => import("./pages/SettingsPage"),
		});

		app.registerPlugin({
			id: "aacsearch",
			name: "AACsearch Sync",
		});
	},
};
