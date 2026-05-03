/**
 * Shopify Sync Engine — full and delta sync of products/variants.
 *
 * Pulls products from Shopify Admin REST API, maps them to AACsearch
 * document schema, and enqueues them via SearchIngestBuffer.
 *
 * Uses the existing sync-jobs library from @repo/database for job tracking
 * and the ShopifyAdminClient's built-in rate limiter (40 req/s).
 */
import { enqueueManySearchIngest, recordSearchUsage } from "@repo/database";
import type { ConnectorSyncJobView, Prisma } from "@repo/database";
import { logger } from "@repo/logs";

import type { CategoryMap } from "./category-sync";
import { buildCategoryMap } from "./category-sync";
import type { ShopifyAdminClient, ShopifyProduct } from "./client";
import type { InventoryMap } from "./inventory-sync";
import { fetchInventoryLevels } from "./inventory-sync";
import type { AacSearchProductDocument } from "./product-mapper";
import { flattenProductToDocuments } from "./product-mapper";

// ─── Config ─────────────────────────────────────────────────

const PAGE_LIMIT = 250; // Shopify max per page
const METAFIELD_LIMIT = 50; // metafields per product
const BATCH_SIZE = 500; // documents to enqueue per batch

// ─── Types ──────────────────────────────────────────────────

export interface SyncResult {
	itemsCount: number;
	failuresCount: number;
	errors: string[];
}

export interface SyncOptions {
	/** If set, only sync products updated after this timestamp (ISO string) */
	updatedSince?: string;
	/** Whether to fetch and index metafields */
	includeMetafields?: boolean;
	/** Whether to fetch accurate inventory levels from InventoryLevel API */
	includeInventory?: boolean;
	/** Whether to fetch collection/category data and attach to documents */
	includeCategories?: boolean;
	/** Optional vendor metadata to attach to every document */
	vendorMetadata?: Record<string, unknown>;
	/** Shopify store shop domain (e.g., mystore.myshopify.com) */
	shop: string;
	/** Index ID for enqueueManySearchIngest */
	indexId: string;
	/** Organization ID for job tracking */
	organizationId: string;
	/** Optional array of specific product IDs to sync (partial sync) */
	productIds?: number[];
}

// ─── Job wrapper helpers ────────────────────────────────────

async function createJob(options: {
	type: "full" | "delta";
	indexId: string;
	organizationId: string;
}): Promise<ConnectorSyncJobView> {
	const { createConnectorSyncJob } = await import("@repo/database");
	return createConnectorSyncJob(options);
}

async function completeJob(
	jobId: string,
	result: { itemsCount: number; failuresCount?: number },
): Promise<void> {
	const { completeConnectorSyncJob } = await import("@repo/database");
	await completeConnectorSyncJob(jobId, result);
}

async function failJob(jobId: string, error: string): Promise<void> {
	const { failConnectorSyncJob } = await import("@repo/database");
	await failConnectorSyncJob(jobId, error);
}

// ─── Metafields fetcher ─────────────────────────────────────

interface ShopifyMetafield {
	key: string;
	namespace: string;
	value: string;
	type: string;
	description?: string;
	owner_id: number;
	created_at: string;
	updated_at: string;
}

async function fetchProductMetafields(
	client: ShopifyAdminClient,
	productId: number,
): Promise<Record<string, unknown>> {
	const query = `
		query getProductMetafields($id: ID!) {
			product(id: $id) {
				metafields(first: ${METAFIELD_LIMIT}) {
					nodes {
						key
						namespace
						value
						type
					}
				}
			}
		}
	`;

	const gid = `gid://shopify/Product/${productId}`;
	const result = await client.graphql<{
		product: {
			metafields: { nodes: ShopifyMetafield[] };
		};
	}>(query, { id: gid });

	if (result.errors) {
		logger.warn("Metafield fetch failed", {
			productId,
			errors: result.errors,
		});
		return {};
	}

	const nodes = result.data?.product?.metafields?.nodes ?? [];
	const metafields: Record<string, unknown> = {};

	for (const mf of nodes) {
		const key = `mf_${mf.namespace}_${mf.key}`;
		metafields[key] = tryParseMetafieldValue(mf.value, mf.type);
	}

	return metafields;
}

function tryParseMetafieldValue(value: string, type: string): unknown {
	if (type === "json" || type === "weight" || type === "volume") {
		try {
			return JSON.parse(value) as unknown;
		} catch {
			return value;
		}
	}
	if (type === "number_integer") return Number.parseInt(value, 10);
	if (type === "number_decimal") return Number.parseFloat(value);
	if (type === "boolean") return value === "true";
	return value;
}

// ─── Product fetching ───────────────────────────────────────

interface ProductsPage {
	products: ShopifyProduct[];
	hasNextPage: boolean;
	nextPageUrl: string | null;
}

async function fetchProductPage(
	client: ShopifyAdminClient,
	sinceId?: number,
	updatedSince?: string,
	limit: number = PAGE_LIMIT,
): Promise<ProductsPage> {
	const params = new URLSearchParams();
	params.set("limit", String(limit));
	if (sinceId) params.set("since_id", String(sinceId));
	if (updatedSince) params.set("updated_at_min", updatedSince);

	const result = await client.get<{
		products: ShopifyProduct[];
	}>(`/products.json`, params);

	const products = result.products ?? [];
	const hasNextPage = products.length >= limit;

	return {
		products,
		hasNextPage,
		nextPageUrl:
			hasNextPage && products.length > 0
				? `since_id=${products[products.length - 1].id}`
				: null,
	};
}

// ─── Batch enqueue ──────────────────────────────────────────

export async function enqueueDocumentBatch(
	indexId: string,
	organizationId: string,
	docs: AacSearchProductDocument[],
): Promise<void> {
	const allDocs: AacSearchProductDocument[] = docs.flat();

	if (allDocs.length === 0) return;

	for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
		const batch = allDocs.slice(i, i + BATCH_SIZE);
		await enqueueManySearchIngest(
			indexId,
			organizationId,
			"upsert",
			batch as unknown as Prisma.InputJsonValue[],
		);
	}
}

// ─── Public sync functions ──────────────────────────────────

/**
 * Run a full sync of all products from a Shopify store.
 *
 * Paginates through all products, flattens variants, and enqueues
 * them into the AACsearch ingest buffer. Creates a sync job for tracking.
 */
export async function runFullSync(
	client: ShopifyAdminClient,
	options: SyncOptions,
): Promise<SyncResult> {
	const {
		shop,
		indexId,
		organizationId,
		includeMetafields,
		includeInventory,
		includeCategories,
		vendorMetadata,
	} = options;

	logger.info("Shopify full sync started", { shop, indexId, organizationId });

	const job = await createJob({
		type: "full",
		indexId,
		organizationId,
	});

	const result: SyncResult = {
		itemsCount: 0,
		failuresCount: 0,
		errors: [],
	};

	try {
		// ─── Pre-fetch enrichment data ──────────────────────────
		let inventoryMap: InventoryMap | undefined;
		let categoryMap: CategoryMap | undefined;

		if (includeInventory) {
			logger.info("Fetching inventory levels before full sync");
			inventoryMap = new Map();
		}

		if (includeCategories) {
			logger.info("Building category map before full sync");
			try {
				categoryMap = await buildCategoryMap(client);
			} catch (err) {
				logger.warn("Failed to build category map, continuing without categories", { err });
				categoryMap = new Map();
			}
		}

		let sinceId: number | undefined;
		let pageCount = 0;

		do {
			const page = await fetchProductPage(client, sinceId, options.updatedSince);

			if (page.products.length === 0) break;
			pageCount++;

			logger.info("Shopify sync page received", {
				page: pageCount,
				count: page.products.length,
			});

			// --- Fetch inventory for this page's products ---
			if (includeInventory && page.products.length > 0) {
				const itemIds: number[] = [];
				for (const p of page.products) {
					for (const v of p.variants) {
						if (v.inventory_item_id) {
							itemIds.push(v.inventory_item_id);
						}
					}
				}
				try {
					const freshMap = await fetchInventoryLevels(client, itemIds);
					if (freshMap.size > 0) {
						inventoryMap = freshMap;
					}
				} catch (err) {
					logger.warn("Failed to fetch inventory levels for page", { page: pageCount, err });
				}
			}

			for (const product of page.products) {
				try {
					let metafields: Record<string, unknown> = {};
					if (includeMetafields) {
						metafields = await fetchProductMetafields(client, product.id);
					}

					const docs = flattenProductToDocuments(
						product,
						shop,
						{
							...vendorMetadata,
							...metafields,
						},
						{ inventoryMap, categoryMap },
					);

					await enqueueDocumentBatch(indexId, organizationId, docs);
					result.itemsCount += docs.length;
				} catch (productError) {
					result.failuresCount++;
					const msg =
						productError instanceof Error ? productError.message : "Unknown error";
					result.errors.push(`Product ${product.id}: ${msg}`);
					logger.error("Shopify product sync failed", {
						productId: product.id,
						error: msg,
					});
				}
			}

			const lastProduct = page.products[page.products.length - 1];
			sinceId = lastProduct.id;
		} while (sinceId);

		await completeJob(job.id, {
			itemsCount: result.itemsCount,
			failuresCount: result.failuresCount,
		});

		void recordSearchUsage({
			indexId,
			organizationId,
			type: "sync_job",
			count: result.itemsCount,
			metadata: {
				jobId: job.id,
				type: "full",
				shop,
				itemsCount: result.itemsCount,
				failuresCount: result.failuresCount,
			},
		}).catch((err) => logger.warn("Shopify sync usage record failed", { err }));

		logger.info("Shopify full sync completed", {
			shop,
			itemsCount: result.itemsCount,
			failuresCount: result.failuresCount,
		});
	} catch (error) {
		const msg = error instanceof Error ? error.message : "sync_failed";
		await failJob(job.id, msg);
		logger.error("Shopify full sync failed", { shop, error: msg });
		throw error;
	}

	return result;
}

/**
 * Run a delta sync of recently updated products.
 *
 * Uses updated_at_min to only fetch products changed since the last sync.
 */
export async function runDeltaSync(
	client: ShopifyAdminClient,
	options: SyncOptions,
): Promise<SyncResult> {
	const { shop, indexId, organizationId, includeMetafields, includeInventory, includeCategories, vendorMetadata } = options;

	const updatedSince =
		options.updatedSince ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	logger.info("Shopify delta sync started", {
		shop,
		indexId,
		updatedSince,
	});

	const job = await createJob({
		type: "delta",
		indexId,
		organizationId,
	});

	const result: SyncResult = {
		itemsCount: 0,
		failuresCount: 0,
		errors: [],
	};

	try {
		let sinceId: number | undefined;
		let pageCount = 0;

		do {
			const page = await fetchProductPage(client, sinceId, updatedSince);

			if (page.products.length === 0) break;
			pageCount++;

			logger.info("Shopify delta sync page received", {
				page: pageCount,
				count: page.products.length,
			});

			// --- Fetch inventory for this page's products ---
			if (includeInventory && page.products.length > 0) {
				const itemIds: number[] = [];
				for (const p of page.products) {
					for (const v of p.variants) {
						if (v.inventory_item_id) {
							itemIds.push(v.inventory_item_id);
						}
					}
				}
				try {
					const freshMap = await fetchInventoryLevels(client, itemIds);
					if (freshMap.size > 0) {
						inventoryMap = freshMap;
					}
				} catch (err) {
					logger.warn("Failed to fetch inventory levels for page", { page: pageCount, err });
				}
			}

			for (const product of page.products) {
				try {
					let metafields: Record<string, unknown> = {};
					if (includeMetafields) {
						metafields = await fetchProductMetafields(client, product.id);
					}

					const docs = flattenProductToDocuments(
						product,
						shop,
						{
							...vendorMetadata,
							...metafields,
						},
						{ inventoryMap, categoryMap },
					);

					await enqueueDocumentBatch(indexId, organizationId, docs);
					result.itemsCount += docs.length;
				} catch (productError) {
					result.failuresCount++;
					const msg =
						productError instanceof Error ? productError.message : "Unknown error";
					result.errors.push(`Product ${product.id}: ${msg}`);
					logger.error("Shopify delta product sync failed", {
						productId: product.id,
						error: msg,
					});
				}
			}

			const lastProduct = page.products[page.products.length - 1];
			sinceId = lastProduct.id;
		} while (sinceId);

		await completeJob(job.id, {
			itemsCount: result.itemsCount,
			failuresCount: result.failuresCount,
		});

		void recordSearchUsage({
			indexId,
			organizationId,
			type: "sync_job",
			count: result.itemsCount,
			metadata: {
				jobId: job.id,
				type: "delta",
				shop,
				itemsCount: result.itemsCount,
				failuresCount: result.failuresCount,
			},
		}).catch((err) => logger.warn("Shopify delta sync usage record failed", { err }));

		logger.info("Shopify delta sync completed", {
			shop,
			itemsCount: result.itemsCount,
			updatedSince,
		});
	} catch (error) {
		const msg = error instanceof Error ? error.message : "sync_failed";
		await failJob(job.id, msg);
		logger.error("Shopify delta sync failed", { shop, error: msg });
		throw error;
	}

	return result;
}
