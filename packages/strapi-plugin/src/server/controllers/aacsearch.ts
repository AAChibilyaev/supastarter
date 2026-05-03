/**
 * AACsearch plugin controllers — admin API endpoints.
 */

import { getPluginConfig, setPluginConfig, applyMapping } from "../services/aacsearch";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StrapiLike = any;

/**
 * Get the current plugin configuration.
 */
export async function getConfig(
	ctx: { body: unknown; status: number; request: { body: unknown } },
	_next: () => Promise<void>,
): Promise<void> {
	try {
		const strapi = (globalThis as Record<string, unknown>).strapi as StrapiLike;
		const config = await getPluginConfig(strapi);
		ctx.body = config;
		ctx.status = 200;
	} catch (err) {
		ctx.body = { error: "Failed to get config", details: String(err) };
		ctx.status = 500;
	}
}

/**
 * Update the plugin configuration.
 */
export async function updateConfig(
	ctx: { body: unknown; status: number; request: { body: unknown } },
	_next: () => Promise<void>,
): Promise<void> {
	try {
		const strapi = (globalThis as Record<string, unknown>).strapi as StrapiLike;
		const newConfig = ctx.request.body as Record<string, unknown>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await setPluginConfig(strapi, newConfig as any);
		ctx.body = { ok: true };
		ctx.status = 200;
	} catch (err) {
		ctx.body = { error: "Failed to update config", details: String(err) };
		ctx.status = 500;
	}
}

/**
 * Manual reindex a specific content type.
 */
export async function reindex(
	ctx: { body: unknown; status: number; params: Record<string, string> },
	_next: () => Promise<void>,
): Promise<void> {
	try {
		const strapi = (globalThis as Record<string, unknown>).strapi as StrapiLike;
		const { contentTypeUid } = ctx.params as { contentTypeUid: string };

		const config = await getPluginConfig(strapi);
		const collectionConfig = config.collections[contentTypeUid];
		if (!collectionConfig) {
			ctx.body = { error: `Content type not configured: ${contentTypeUid}` };
			ctx.status = 400;
			return;
		}

		const entries = (await strapi.db.query(contentTypeUid).findMany()) as Record<
			string,
			unknown
		>[];
		const { AacSearchClient } = await import("../services/client");
		const client = new AacSearchClient({ baseUrl: config.baseUrl, token: config.token });

		const mapped = entries.map((entry) => applyMapping(entry, collectionConfig));
		const result = await client.fullSync(collectionConfig.indexSlug, mapped);

		ctx.body = { ok: true, synced: result.synced, total: entries.length };
		ctx.status = 200;
	} catch (err) {
		ctx.body = { error: "Reindex failed", details: String(err) };
		ctx.status = 500;
	}
}

/**
 * Test the AACsearch connection.
 */
export async function testConnection(
	ctx: { body: unknown; status: number },
	_next: () => Promise<void>,
): Promise<void> {
	try {
		const strapi = (globalThis as Record<string, unknown>).strapi as StrapiLike;
		const config = await getPluginConfig(strapi);
		const { AacSearchClient } = await import("../services/client");
		const client = new AacSearchClient({ baseUrl: config.baseUrl, token: config.token });

		const result = await client.syncDocuments("_test_connection", [
			{ id: "test", message: "AACsearch Strapi plugin connection test" },
		]);

		ctx.body = { ok: true, result };
		ctx.status = 200;
	} catch (err) {
		ctx.body = { error: "Connection test failed", details: String(err) };
		ctx.status = 500;
	}
}
