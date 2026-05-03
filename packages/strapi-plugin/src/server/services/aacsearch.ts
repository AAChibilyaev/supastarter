/**
 * AACsearch Strapi sync service — handles all AACsearch API communication.
 */

/** AACsearch connector configuration stored in Strapi plugin config */
export interface AacsearchPluginConfig {
	baseUrl: string;
	token: string;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StrapiLike = any;

/**
 * Sync a document to AACsearch.
 */
export async function syncDocument(
	strapi: StrapiLike,
	contentTypeUid: string,
	document: Record<string, unknown>,
	action: "create" | "update" | "delete",
): Promise<void> {
	const config = await getPluginConfig(strapi);
	const collectionConfig = config.collections[contentTypeUid];
	if (!collectionConfig) return;

	if (config.debug && strapi.log) {
		strapi.log.debug(`[aacsearch] ${action.toUpperCase()} ${contentTypeUid}:${document.id}`);
	}

	const { AacSearchClient } = await import("./client");
	const client = new AacSearchClient({ baseUrl: config.baseUrl, token: config.token });

	switch (action) {
		case "delete":
			await client.deleteDocument(
				collectionConfig.indexSlug,
				String(document.id ?? document.documentId),
			);
			break;
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
		for (const [key, mappedKey] of Object.entries(fieldMapping)) {
			if (key in doc) {
				result[mappedKey] = doc[key];
			}
		}
	} else {
		result = { ...doc };
	}

	if (includeFields && includeFields.length > 0) {
		result = Object.fromEntries(
			Object.entries(result).filter(([k]) => k === idColumn || includeFields.includes(k)),
		);
	}

	if (excludeFields && excludeFields.length > 0) {
		for (const field of excludeFields) delete result[field];
	}

	return result;
}

/**
 * Get the plugin configuration from Strapi store.
 */
export async function getPluginConfig(strapi: StrapiLike): Promise<AacsearchPluginConfig> {
	const service = strapi.plugin("aacsearch").service("aacsearch");
	const config = await service.getConfig();
	return config as AacsearchPluginConfig;
}

/**
 * Set the plugin configuration.
 */
export async function setPluginConfig(
	strapi: StrapiLike,
	config: AacsearchPluginConfig,
): Promise<void> {
	const service = strapi.plugin("aacsearch").service("aacsearch");
	await service.setConfig(config);
}
