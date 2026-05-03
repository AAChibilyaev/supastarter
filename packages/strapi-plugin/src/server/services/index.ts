/**
 * AACsearch Strapi plugin — server services.
 * Registers the core AACsearch service for configuration storage and sync operations.
 */

import type { Strapi } from "@strapi/types";
import type { AacsearchPluginConfig } from "./aacsearch";

const DEFAULT_CONFIG: AacsearchPluginConfig = {
	baseUrl: "",
	token: "",
	collections: {},
	debug: false,
};

export default {
	/**
	 * Get the AACsearch plugin configuration from the Strapi store.
	 */
	async getConfig(strapi: Strapi): Promise<AacsearchPluginConfig> {
		try {
			const config = await strapi.store?.get({
				type: "plugin",
				name: "aacsearch",
				key: "config",
			});
			return (config as AacsearchPluginConfig) ?? DEFAULT_CONFIG;
		} catch {
			return DEFAULT_CONFIG;
		}
	},

	/**
	 * Save the AACsearch plugin configuration to the Strapi store.
	 */
	async setConfig(strapi: Strapi, config: AacsearchPluginConfig): Promise<void> {
		await strapi.store?.set({
			type: "plugin",
			name: "aacsearch",
			key: "config",
			value: config,
		});
	},
};
