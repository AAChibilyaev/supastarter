/**
 * Strapi lifecycle hooks — register afterCreate/afterUpdate/afterDelete for configured content types.
 */

import { getPluginConfig, syncDocument } from "../services/aacsearch";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StrapiLike = any;

/**
 * Register lifecycle hooks for all configured content types.
 */
export function registerLifecycles(strapi: StrapiLike): void {
	const configPromise = getPluginConfig(strapi);

	configPromise
		.then((config) => {
			if (!config?.collections) return;

			const contentTypeUids = Object.keys(config.collections);

			for (const uid of contentTypeUids) {
				const model = strapi.contentType(uid);
				if (!model) {
					if (strapi.log) strapi.log.warn(`[aacsearch] Content type not found: ${uid}`);
					continue;
				}

				if (strapi.log) strapi.log.info(`[aacsearch] Registering lifecycles for: ${uid}`);

				strapi.db.lifecycles.subscribe({
					model: uid,
					afterCreate: async (event: { result: Record<string, unknown> }) => {
						try {
							await syncDocument(strapi, uid, event.result, "create");
						} catch (err) {
							if (strapi.log)
								strapi.log.error(`[aacsearch] afterCreate error for ${uid}:`, err);
						}
					},
					afterUpdate: async (event: { result: Record<string, unknown> }) => {
						try {
							await syncDocument(strapi, uid, event.result, "update");
						} catch (err) {
							if (strapi.log)
								strapi.log.error(`[aacsearch] afterUpdate error for ${uid}:`, err);
						}
					},
					afterDelete: async (event: { result: Record<string, unknown> }) => {
						try {
							await syncDocument(strapi, uid, event.result, "delete");
						} catch (err) {
							if (strapi.log)
								strapi.log.error(`[aacsearch] afterDelete error for ${uid}:`, err);
						}
					},
				});
			}
		})
		.catch((err: Error) => {
			if (strapi.log)
				strapi.log.error(
					"[aacsearch] Failed to load config for lifecycle registration:",
					err,
				);
		});
}
