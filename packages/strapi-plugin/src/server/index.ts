/**
 * Strapi v5 AACsearch Plugin — entry point (server).
 */

export default {
	register({ strapi }: { strapi: unknown }) {
		const { registerLifecycles } = require("./lifecycles");
		registerLifecycles(strapi);
	},

	bootstrap({ strapi }: { strapi: unknown }) {
		const s = strapi as { log: { info: (msg: string) => void } };
		s.log.info("[aacsearch] Plugin bootstrapped");
	},

	destroy({ strapi }: { strapi: unknown }) {
		const s = strapi as { log: { info: (msg: string) => void } };
		s.log.info("[aacsearch] Plugin shutdown");
	},
};
