/**
 * Strapi lifecycle hooks — register afterCreate/afterUpdate/afterDelete for configured content types.
 */

import type { Strapi } from "@strapi/types";
import { getPluginConfig, syncDocument } from "../services/aacsearch";

/**
 * Register lifecycle hooks for all configured content types.
 */
export function registerLifecycles(strapi: Strapi): void {
	const config = getPluginConfig(strapi);

	if (!config?.collections) return;

	const contentTypeUids = Object.keys(config.collections);

	for (const uid of contentTypeUids) {
		const model = strapi.contentType(uid);
		if (!model) {
			strapi.log.warn(`[aacsearch] Content type not found: ${uid}`);
			continue;
		}

		strapi.log.info(`[aacsearch] Registering lifecycles for: ${uid}`);

		// afterCreate is called after a new entry is created
		strapi.db.lifecycles.subscribe({
			model: uid,
			afterCreate: async (event: { result: Record<string, unknown> }) => {
				try {
					await syncDocument(strapi, uid, event.result, "create");
				} catch (err) {
					strapi.log.error(`[aacsearch] afterCreate error for ${uid}:`, err);
				}
			},
		});

		// afterUpdate is called after an entry is updated
		strapi.db.lifecycles.subscribe({
			model: uid,
			afterUpdate: async (event: { result: Record<string, unknown> }) => {
				try {
					await syncDocument(strapi, uid, event.result, "update");
				} catch (err) {
					strapi.log.error(`[aacsearch] afterUpdate error for ${uid}:`, err);
				}
			},
		});

		// afterDelete is called after an entry is deleted
		strapi.db.lifecycles.subscribe({
			model: uid,
			afterDelete: async (event: { result: Record<string, unknown> }) => {
				try {
					await syncDocument(strapi, uid, event.result, "delete");
				} catch (err) {
					strapi.log.error(`[aacsearch] afterDelete error for ${uid}:`, err);
				}
			},
		});
	}
}
