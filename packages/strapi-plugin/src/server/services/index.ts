/**
 * AACsearch Strapi plugin — server services.
 */

import type { AacsearchPluginConfig } from "./aacsearch";

const DEFAULT_CONFIG: AacsearchPluginConfig = {
	baseUrl: "",
	token: "",
	collections: {},
	debug: false,
};

export default {
	async getConfig(strapi: {
		store?: { get: (opts: { type: string; name: string; key: string }) => Promise<unknown> };
	}): Promise<AacsearchPluginConfig> {
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

	async setConfig(
		strapi: {
			store?: {
				set: (opts: {
					type: string;
					name: string;
					key: string;
					value: unknown;
				}) => Promise<void>;
			};
		},
		config: AacsearchPluginConfig,
	): Promise<void> {
		await strapi.store?.set({
			type: "plugin",
			name: "aacsearch",
			key: "config",
			value: config,
		});
	},
};
