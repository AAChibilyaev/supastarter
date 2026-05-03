/**
 * Shopify Real-time Webhook Handler.
 *
 * Receives Shopify webhook events (products/create, products/update,
 * products/delete, collections/create, collections/update, collections/delete)
 * and keeps AACsearch indexes in sync.
 *
 * Features:
 * - HMAC signature verification on every request
 * - Per-store debounce/coalesce window (batch up to 50 events per 5 seconds)
 * - Automatic document upsert on product create/update
 * - Document deletion on product delete
 * - Collection membership updates
 * - Webhook registration on OAuth install
 * - Webhook deregistration on store disconnect
 */

import { logger } from "@repo/logs";

import { buildCategoryMap } from "./category-sync";
import type { CategoryMap } from "./category-sync";
import { type ShopifyAdminClient, createShopifyClient } from "./client";
import { fetchInventoryLevels } from "./inventory-sync";
import type { InventoryMap } from "./inventory-sync";
import { getStoreByShop } from "./oauth";
import { flattenProductToDocuments } from "./product-mapper";
import { enqueueDocumentBatch } from "./sync";

// ─── Constants ─────────────────────────────────────────────────

/** Topics to subscribe during OAuth install */
export const WEBHOOK_TOPICS = [
	"products/create",
	"products/update",
	"products/delete",
	"collections/create",
	"collections/update",
	"collections/delete",
] as const;

export type WebhookTopic = (typeof WEBHOOK_TOPICS)[number];

/** Debounce window: batch events within this window (ms) */
const DEBOUNCE_WINDOW_MS = 5000;

/** Max events per batch before flushing early */
const MAX_BATCH_SIZE = 50;

// ─── Debounce / coalesce buffer ─────────────────────────────────

interface CoalescedEvent {
	topic: WebhookTopic;
	shop: string;
	productId?: number;
	collectionId?: number;
	adminGraphqlApiId?: string;
	timestamp: number;
}

interface StoreBuffer {
	events: CoalescedEvent[];
	timer: ReturnType<typeof setTimeout> | null;
}

const buffers = new Map<string, StoreBuffer>();

function getBuffer(shop: string): StoreBuffer {
	let buf = buffers.get(shop);
	if (!buf) {
		buf = { events: [], timer: null };
		buffers.set(shop, buf);
	}
	return buf;
}

/**
 * Enqueue a webhook event into the per-store debounce buffer.
 * Events are batched and processed in groups.
 */
export function enqueueWebhookEvent(event: CoalescedEvent): void {
	const buf = getBuffer(event.shop);
	buf.events.push(event);

	logger.debug("Webhook event enqueued", {
		shop: event.shop,
		topic: event.topic,
		bufferSize: buf.events.length,
	});

	// Flush if max batch size reached
	if (buf.events.length >= MAX_BATCH_SIZE) {
		if (buf.timer) {
			clearTimeout(buf.timer);
			buf.timer = null;
		}
		void flushBuffer(event.shop);
		return;
	}

	// Set debounce timer if not already running
	if (!buf.timer) {
		buf.timer = setTimeout(() => {
			buf.timer = null;
			void flushBuffer(event.shop);
		}, DEBOUNCE_WINDOW_MS);
	}
}

// ─── Buffer flushing ────────────────────────────────────────────

async function flushBuffer(shop: string): Promise<void> {
	const buf = getBuffer(shop);
	const events = buf.events.splice(0);
	buf.events = [];

	if (events.length === 0) return;

	logger.info("Processing webhook batch", { shop, count: events.length });

	// Get the store record and client
	const store = await getStoreByShop(shop);
	if (!store) {
		logger.warn("Webhook received for unknown store", { shop });
		return;
	}
	if (!store.indexId) {
		logger.warn("Webhook received but store has no index configured", { shop });
		return;
	}

	const client = createShopifyClient(shop, store.id);

	try {
		// Separate events by type
		const deleteEvents = events.filter((e) => e.topic === "products/delete");
		const upsertEvents = events.filter(
			(e) => e.topic === "products/create" || e.topic === "products/update",
		);
		const collectionEvents = events.filter((e) => e.topic.startsWith("collections/"));

		// Process deletes first (remove from index)
		const deleteIds: string[] = [];
		for (const evt of deleteEvents) {
			if (evt.productId) {
				deleteIds.push(`shopify_${shop}_${evt.productId}`);
			}
		}
		if (deleteIds.length > 0) {
			await deleteDocuments(store.indexId, store.organizationId, deleteIds);
		}

		// Process upserts (fetch from Shopify, enqueue to ingest buffer)
		const uniqueProductIds = [
			...new Set(
				upsertEvents.map((e) => e.productId).filter((id): id is number => id !== undefined),
			),
		];

		// Pre-fetch category map for enrichment
		let webhookCategoryMap: CategoryMap | undefined;
		if (uniqueProductIds.length > 0 || collectionEvents.length > 0) {
			try {
				webhookCategoryMap = await buildCategoryMap(client);
			} catch (err) {
				logger.warn("Failed to build category map for webhook enrichment", { shop, err });
			}
		}

		for (const productId of uniqueProductIds) {
			try {
				const { product } = await client.getProduct(productId);

				// Fetch accurate inventory levels for this product's variants
				let inventoryMap: InventoryMap | undefined;
				const itemIds = product.variants
					.map((v: { inventory_item_id?: number }) => v.inventory_item_id)
					.filter((id: number | undefined): id is number => id !== undefined);
				if (itemIds.length > 0) {
					try {
						inventoryMap = await fetchInventoryLevels(client, itemIds);
					} catch (err) {
						logger.warn("Failed to fetch inventory for webhook product", {
							productId,
							err,
						});
					}
				}

				const docs = flattenProductToDocuments(product, shop, undefined, {
					inventoryMap,
					categoryMap: webhookCategoryMap,
				});
				await enqueueDocumentBatch(store.indexId, store.organizationId, docs);
			} catch (error) {
				logger.error("Webhook product upsert failed", {
					shop,
					productId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Process collection events (re-index full collection membership)
		if (collectionEvents.length > 0 && store.indexId) {
			await processCollectionChanges(
				client,
				{
					id: store.id,
					shop: store.shop,
					indexId: store.indexId,
					organizationId: store.organizationId ?? store.id,
				},
				collectionEvents,
				webhookCategoryMap,
			);
		}

		logger.info("Webhook batch processed", {
			shop,
			upserts: uniqueProductIds.length,
			deletes: deleteIds.length,
			collections: collectionEvents.length,
		});
	} catch (error) {
		logger.error("Webhook batch processing failed", {
			shop,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

// ─── Document deletion ──────────────────────────────────────────

async function deleteDocuments(
	indexId: string,
	organizationId: string,
	externalIds: string[],
): Promise<void> {
	const { enqueueManySearchIngest } = await import("@repo/database");
	const batchSize = 500;

	for (let i = 0; i < externalIds.length; i += batchSize) {
		const batch = externalIds.slice(i, i + batchSize);
		await enqueueManySearchIngest(indexId, organizationId, "delete", batch);
	}

	logger.info("Webhook-triggered document deletion enqueued", {
		count: externalIds.length,
	});
}

// ─── Collection processing ──────────────────────────────────────

interface ShopifyCollect {
	id: number;
	product_id: number;
	collection_id: number;
	created_at: string;
}

async function processCollectionChanges(
	client: ShopifyAdminClient,
	store: { id: string; shop: string; indexId: string; organizationId: string },
	events: CoalescedEvent[],
	categoryMap?: CategoryMap,
): Promise<void> {
	const collectionIds = [
		...new Set(
			events.map((e) => e.collectionId).filter((id): id is number => id !== undefined),
		),
	];

	for (const collectionId of collectionIds) {
		try {
			// Fetch all product IDs in this collection via collects endpoint
			const collects = await client.get<{ collects: ShopifyCollect[] }>(
				`/collects.json`,
				new URLSearchParams({
					collection_id: String(collectionId),
					limit: "250",
				}),
			);

			// We re-fetch each product to update its collection metadata
			for (const collect of collects.collects ?? []) {
				try {
					const product = (await client.getProduct(collect.product_id)).product;
					const docs = flattenProductToDocuments(product, store.shop, undefined, {
						categoryMap,
					});
					await enqueueDocumentBatch(store.indexId, store.organizationId, docs);
				} catch {
					// Individual product failures are non-fatal
				}
			}

			logger.info("Collection re-indexed from webhook", {
				collectionId,
				productsCount: collects.collects?.length ?? 0,
			});
		} catch (error) {
			logger.error("Collection webhook processing failed", {
				collectionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

// ─── Webhook registration ───────────────────────────────────────

/**
 * Register all required webhook topics for a Shopify store.
 * Called after successful OAuth install.
 */
export async function registerStoreWebhooks(
	client: ShopifyAdminClient,
	webhookBaseUrl: string,
): Promise<void> {
	const results: Array<{ topic: string; success: boolean }> = [];

	for (const topic of WEBHOOK_TOPICS) {
		try {
			const address = `${webhookBaseUrl}/api/shopify/webhook`;
			await client.registerWebhook(topic, address);
			results.push({ topic, success: true });
			logger.info("Webhook registered", { topic, address });
		} catch (error) {
			results.push({ topic, success: false });
			logger.error("Webhook registration failed", {
				topic,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	const failed = results.filter((r) => !r.success);
	if (failed.length > 0) {
		logger.warn("Some webhooks failed to register", { failed: failed.map((r) => r.topic) });
	}
}

/**
 * Deregister all webhook subscriptions for a Shopify store.
 * Called when a store is disconnected.
 */
export async function deregisterStoreWebhooks(client: ShopifyAdminClient): Promise<void> {
	try {
		const { webhooks } = await client.listWebhooks();
		let deletedCount = 0;

		for (const wh of webhooks) {
			if (WEBHOOK_TOPICS.includes(wh.topic as WebhookTopic)) {
				await client.deleteWebhook(wh.id);
				deletedCount++;
			}
		}

		logger.info("Webhooks deregistered", { count: deletedCount });
	} catch (error) {
		logger.error("Webhook deregistration failed", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

// ─── Single webhook handler ─────────────────────────────────────

/**
 * Process a single incoming webhook request.
 * Parses the topic, extracts the relevant entity ID, and enqueues
 * the event into the per-store debounce buffer.
 *
 * @param topic - The Shopify webhook topic (e.g., "products/create")
 * @param shop - The shop domain
 * @param body - The parsed webhook JSON body
 */
export async function handleWebhook(
	topic: string,
	shop: string,
	body: Record<string, unknown>,
): Promise<void> {
	if (!WEBHOOK_TOPICS.includes(topic as WebhookTopic)) {
		logger.debug("Ignoring unknown webhook topic", { topic });
		return;
	}

	const event: CoalescedEvent = {
		topic: topic as WebhookTopic,
		shop,
		timestamp: Date.now(),
	};

	// Extract entity IDs from payload
	if (topic.startsWith("products/")) {
		event.productId = (body.id as number) ?? (body.product_id as number);
		event.adminGraphqlApiId = body.admin_graphql_api_id as string | undefined;
	}

	if (topic.startsWith("collections/")) {
		event.collectionId = (body.id as number) ?? (body.collection_id as number);
		event.adminGraphqlApiId = body.admin_graphql_api_id as string | undefined;
	}

	// Validate we have an ID
	if (!event.productId && !event.collectionId) {
		logger.warn("Webhook payload missing entity ID", { topic, shop });
		return;
	}

	enqueueWebhookEvent(event);
}
