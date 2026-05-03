/**
 * Strapi v5 AACsearch Plugin — entry point (server).
 * 
 * This file is the Strapi server entry via `strapi-server.js` → `dist/server/index.js`.
 */

import type { Strapi } from "@strapi/types";

export default {
	register({ strapi }: { strapi: Strapi }) {
		// Register lifecycle hooks for configured content types
		const { registerLifecycles } = require("./lifecycles");
		registerLifecycles(strapi);
	},

	bootstrap({ strapi }: { strapi: Strapi }) {
		// Perform initial sync or other startup tasks
		strapi.log.info("[aacsearch] Plugin bootstrapped");
	},

	destroy({ strapi }: { strapi: Strapi }) {
		strapi.log.info("[aacsearch] Plugin shutdown");
	},
};
