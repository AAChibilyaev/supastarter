/**
 * Shopify Inventory Sync — fetch accurate inventory levels from Shopify
 * InventoryLevel API and merge them into AACsearch documents.
 *
 * Uses the Shopify Admin REST API InventoryLevel endpoint:
 *   GET /admin/api/2024-10/inventory_levels.json?inventory_item_ids=...
 *
 * Handles multi-location inventory by summing quantities across all locations.
 */
import { logger } from "@repo/logs";

import type { ShopifyAdminClient } from "./client";

// ─── Types ──────────────────────────────────────────────────

export interface InventoryLevel {
	inventory_item_id: number;
	location_id: number;
	available: number;
	updated_at: string;
}

export interface ShopifyLocation {
	id: number;
	name: string;
	address1: string | null;
	city: string | null;
	province: string | null;
	country: string | null;
	active: boolean;
}

/** Per-variant inventory data keyed by inventory_item_id */
export type InventoryMap = Map<number, number>;

// ─── API Constants ──────────────────────────────────────────

const INVENTORY_BATCH_SIZE = 50; // Shopify max inventory_item_ids per request
const PAGE_LIMIT = 250;

// ─── Locations ──────────────────────────────────────────────

/**
 * Fetch all active locations for the store.
 */
export async function fetchLocations(client: ShopifyAdminClient): Promise<ShopifyLocation[]> {
	try {
		const result = await client.get<{ locations: ShopifyLocation[] }>("/locations.json");
		return (result.locations ?? []).filter((loc) => loc.active);
	} catch (error) {
		logger.warn("Failed to fetch Shopify locations", { error });
		return [];
	}
}

// ─── Inventory levels ───────────────────────────────────────

/**
 * Fetch inventory levels for a batch of inventory_item_ids across all locations.
 *
 * Shopify's InventoryLevel API returns levels at a specific location.
 * We pass location_ids to scope requests, summing available quantities
 * per inventory_item_id across all relevant locations.
 */
async function fetchInventoryLevelsBatch(
	client: ShopifyAdminClient,
	inventoryItemIds: number[],
	locationIds: number[],
): Promise<InventoryLevel[]> {
	if (inventoryItemIds.length === 0) return [];

	const params = new URLSearchParams();
	params.set("inventory_item_ids", inventoryItemIds.join(","));
	params.set("location_ids", locationIds.join(","));
	params.set("limit", String(PAGE_LIMIT));

	try {
		const result = await client.get<{
			inventory_levels: InventoryLevel[];
		}>("/inventory_levels.json", params);
		return result.inventory_levels ?? [];
	} catch (error) {
		logger.warn("Failed to fetch inventory levels batch", {
			count: inventoryItemIds.length,
			error,
		});
		return [];
	}
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Fetch accurate inventory levels for a set of inventory_item_ids.
 *
 * Returns an InventoryMap (Map<inventory_item_id, total_available>)
 * with quantities summed across all active store locations.
 *
 * If locations or inventory data can't be fetched, returns an empty map
 * so the sync can continue without interruption.
 */
export async function fetchInventoryLevels(
	client: ShopifyAdminClient,
	inventoryItemIds: number[],
): Promise<InventoryMap> {
	if (inventoryItemIds.length === 0) return new Map();

	// Deduplicate inventory item IDs
	const seen = new Set<number>();
	const uniqueIds: number[] = [];
	for (const id of inventoryItemIds) {
		if (!seen.has(id)) {
			seen.add(id);
			uniqueIds.push(id);
		}
	}
	const locations = await fetchLocations(client);

	if (locations.length === 0) {
		logger.warn("No active locations found, skipping inventory fetch");
		return new Map();
	}

	const locationIds = locations.map((loc) => loc.id);
	const inventoryMap: InventoryMap = new Map();

	// Process in batches of INVENTORY_BATCH_SIZE
	for (let i = 0; i < uniqueIds.length; i += INVENTORY_BATCH_SIZE) {
		const batch = uniqueIds.slice(i, i + INVENTORY_BATCH_SIZE);
		const levels = await fetchInventoryLevelsBatch(client, batch, locationIds);

		// Sum available quantities per inventory_item_id across all locations
		for (const level of levels) {
			const current = inventoryMap.get(level.inventory_item_id) ?? 0;
			inventoryMap.set(level.inventory_item_id, current + level.available);
		}
	}

	logger.info("Fetched inventory levels", {
		itemsCount: inventoryMap.size,
		totalIds: uniqueIds.length,
		locations: locations.length,
	});

	return inventoryMap;
}
