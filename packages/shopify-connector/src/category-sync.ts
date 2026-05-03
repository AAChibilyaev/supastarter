/**
 * Shopify Category Sync — fetch collections (custom + smart) and build
 * product-to-category mapping for AACsearch documents.
 *
 * Uses the Shopify Admin REST API:
 *   GET /admin/api/2024-10/custom_collections.json
 *   GET /admin/api/2024-10/smart_collections.json
 *   GET /admin/api/2024-10/collects.json?collection_id=...
 *
 * Handles smart collections (auto-populated by rules) and custom collections
 * (manually curated). Builds a per-product category map.
 */
import { logger } from "@repo/logs";

import type { ShopifyAdminClient, ShopifyCollection } from "./client";

// ─── Types ──────────────────────────────────────────────────

export interface CollectionInfo {
	id: number;
	title: string;
	handle: string;
	type: "custom" | "smart";
}

/** Per-product category data keyed by product_id */
export interface ProductCategories {
	categoryIds: number[];
	categoryNames: string[];
}

/** Product-to-categories map */
export type CategoryMap = Map<number, ProductCategories>;

/** Collect record from Shopify's Collects API */
interface ShopifyCollect {
	id: number;
	collection_id: number;
	product_id: number;
	position: number;
	sort_value: string;
	created_at: string;
}

// ─── API Constants ──────────────────────────────────────────

const PAGE_LIMIT = 250;

// ─── Collection fetching ────────────────────────────────────

/**
 * Fetch custom collections with pagination.
 */
async function fetchCustomCollections(client: ShopifyAdminClient): Promise<ShopifyCollection[]> {
	const allCollections: ShopifyCollection[] = [];
	let sinceId: number | undefined;

	do {
		const params = new URLSearchParams();
		params.set("limit", String(PAGE_LIMIT));
		if (sinceId) params.set("since_id", String(sinceId));

		const result = await client.get<{
			custom_collections: ShopifyCollection[];
		}>("/custom_collections.json", params);

		const collections = result.custom_collections ?? [];
		allCollections.push(...collections);

		if (collections.length < PAGE_LIMIT) break;
		sinceId = collections[collections.length - 1].id;
	} while (sinceId);

	logger.info("Fetched custom collections", {
		count: allCollections.length,
	});

	return allCollections;
}

/**
 * Fetch smart collections with pagination.
 */
async function fetchSmartCollections(client: ShopifyAdminClient): Promise<ShopifyCollection[]> {
	const allCollections: ShopifyCollection[] = [];
	let sinceId: number | undefined;

	do {
		const params = new URLSearchParams();
		params.set("limit", String(PAGE_LIMIT));
		if (sinceId) params.set("since_id", String(sinceId));

		const result = await client.get<{
			smart_collections: ShopifyCollection[];
		}>("/smart_collections.json", params);

		const collections = result.smart_collections ?? [];
		allCollections.push(...collections);

		if (collections.length < PAGE_LIMIT) break;
		sinceId = collections[collections.length - 1].id;
	} while (sinceId);

	logger.info("Fetched smart collections", {
		count: allCollections.length,
	});

	return allCollections;
}

/**
 * Fetch all collections (custom + smart) and return typed collection info.
 */
async function fetchAllCollections(client: ShopifyAdminClient): Promise<CollectionInfo[]> {
	const [custom, smart] = await Promise.all([
		fetchCustomCollections(client),
		fetchSmartCollections(client),
	]);

	const collections: CollectionInfo[] = [
		...custom.map((c) => ({
			id: c.id,
			title: c.title,
			handle: c.handle,
			type: "custom" as const,
		})),
		...smart.map((c) => ({
			id: c.id,
			title: c.title,
			handle: c.handle,
			type: "smart" as const,
		})),
	];

	return collections;
}

// ─── Collects (collection-product mapping) ──────────────────

/**
 * Fetch all collect records for a given collection_id with pagination.
 */
async function fetchCollectsForCollection(
	client: ShopifyAdminClient,
	collectionId: number,
): Promise<number[]> {
	const productIds: number[] = [];
	let sinceId: number | undefined;

	do {
		const params = new URLSearchParams();
		params.set("collection_id", String(collectionId));
		params.set("limit", String(PAGE_LIMIT));
		if (sinceId) params.set("since_id", String(sinceId));

		const result = await client.get<{
			collects: ShopifyCollect[];
		}>("/collects.json", params);

		const collects = result.collects ?? [];
		for (const c of collects) {
			productIds.push(c.product_id);
		}

		if (collects.length < PAGE_LIMIT) break;
		sinceId = collects[collects.length - 1].id;
	} while (sinceId);

	return productIds;
}

/**
 * Build product-to-category map by fetching all collects for all collections.
 *
 * Returns a Map<product_id, { categoryIds, categoryNames }>.
 */
export async function buildCategoryMap(client: ShopifyAdminClient): Promise<CategoryMap> {
	const collections = await fetchAllCollections(client);
	const categoryMap: CategoryMap = new Map();

	// Process collections sequentially to respect rate limits
	for (const collection of collections) {
		try {
			const productIds = await fetchCollectsForCollection(client, collection.id);

			for (const productId of productIds) {
				const existing = categoryMap.get(productId) ?? {
					categoryIds: [],
					categoryNames: [],
				};
				existing.categoryIds.push(collection.id);
				existing.categoryNames.push(collection.title);
				categoryMap.set(productId, existing);
			}
		} catch (error) {
			logger.warn("Failed to fetch collects for collection", {
				collectionId: collection.id,
				collectionTitle: collection.title,
				error,
			});
			// Continue with other collections
		}
	}

	logger.info("Built category map", {
		collectionsCount: collections.length,
		productsWithCategories: categoryMap.size,
	});

	return categoryMap;
}

/**
 * Get categories for a specific product by looking up the category map.
 */
export function getProductCategories(
	categoryMap: CategoryMap,
	productId: number,
): ProductCategories {
	return (
		categoryMap.get(productId) ?? {
			categoryIds: [],
			categoryNames: [],
		}
	);
}
