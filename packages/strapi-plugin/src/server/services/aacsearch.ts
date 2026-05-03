/**
 * AACsearch Strapi sync service — handles all AACsearch API communication.
 */

import type { Strapi } from "@strapi/types";

/** AACsearch connector configuration stored in Strapi plugin config */
export interface AacsearchPluginConfig {
	baseUrl: string;
	token: string;
	/** Collection-level mappings: keyed by content type UID */
	collections: Record<string, CollectionConfig>;
	debug?: boolean;
}

export interface CollectionConfig {
	indexSlug: string;
	idColumn?: string;
	includeFields?: string[];
	excludeFields?: string[];
	fieldMapping?: Record<string, string>;
}

/**
 * Sync a document to AACsearch.
 */
export async function syncDocument(
	strapi: Strapi,
	contentTypeUid: string,
	document: Record<string, unknown>,
	action: "create" | "update" | "delete",
): Promise<void> {
	const config = await getPluginConfig(strapi);
	const collectionConfig = config.collections[contentTypeUid];
	if (!collectionConfig) return;

	if (config.debug) {
		strapi.log.debug(`[aacsearch] ${action.toUpperCase()} ${contentTypeUid}:${document.id}`);
	}

	const { AacSearchClient } = await import("./client");
	const client = new AacSearchClient({
		baseUrl: config.baseUrl,
		token: config.token,
	});

	switch (action) {
		case "delete": {
			await client.deleteDocument(
				collectionConfig.indexSlug,
				String(document.id ?? document.documentId),
			);
			break;
		}
		case "create":
		case "update": {
			const mapped = applyMapping(document, collectionConfig);
			await client.syncDocuments(collectionConfig.indexSlug, [mapped]);
			break;
		}
	}
}

/**
 * Apply field mapping, include/exclude filters to a document.
 */
export function applyMapping(
	doc: Record<string, unknown>,
	config: CollectionConfig,
): Record<string, unknown> {
	const { fieldMapping, includeFields, excludeFields, idColumn = "id" } = config;
	let result: Record<string, unknown> = { [idColumn]: doc.id ?? doc.documentId };

	if (fieldMapping) {
		const keys = Object.keys(fieldMapping);
		if (includeFields) {
			// Only map fields that are in includeFields
			for (const key of keys) {
				if (includeFields.includes(key) && key in doc) {
					result[fieldMapping[key]] = doc[key];
				}
			}
		} else {
			for (const key of keys) {
				if (key in doc) {
					result[fieldMapping[key]] = doc[key];
				}
			}
		}
	} else {
		// Passthrough
		result = { ...doc };
	}

	if (excludeFields && excludeFields.length > 0) {
		for (const field of excludeFields) {
			delete result[field];
		}
	}

	return result;
}

/**
 * Get the plugin configuration from Strapi store.
 */
export async function getPluginConfig(strapi: Strapi): Promise<AacsearchPluginConfig> {
	const config = await strapi
		.plugin("aacsearch")
		.service("aacsearch")
		.getConfig();

	return config as AacsearchPluginConfig;
}

/**
 * Set the plugin configuration.
 */
export async function setPluginConfig(
	strapi: Strapi,
	config: AacsearchPluginConfig,
): Promise<void> {
	await strapi
		.plugin("aacsearch")
		.service("aacsearch")
		.setConfig(config);
}
