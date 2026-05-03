/**
 * Shopify Admin API client — REST + GraphQL with rate limiting.
 *
 * Rate limits: 40 req/s per store (2 req/s burst).
 * Implements a simple leaky-bucket rate limiter per store.
 */

import { logger } from "@repo/logs";

import { getStoreAccessToken } from "./oauth";

// ─── Rate limiter ───────────────────────────────────────────────

interface Bucket {
	tokens: number;
	lastRefill: number;
}

const buckets = new Map<string, Bucket>();

const MAX_TOKENS = 40
const REFILL_INTERVAL_MS = 1000; // 1 second
const REFILL_RATE = 40; // 40 tokens per second

function getBucket(storeId: string): Bucket {
	let bucket = buckets.get(storeId);
	if (!bucket) {
		bucket = { tokens: MAX_TOKENS, lastRefill: Date.now() };
		buckets.set(storeId, bucket);
	}
	return bucket;
}

function refillBucket(bucket: Bucket): void {
	const now = Date.now();
	const elapsed = now - bucket.lastRefill;
	const tokensToAdd = Math.floor((elapsed / REFILL_INTERVAL_MS) * REFILL_RATE);
	if (tokensToAdd > 0) {
		bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + tokensToAdd);
		bucket.lastRefill = now;
	}
}

async function acquireToken(storeId: string): Promise<void> {
	const bucket = getBucket(storeId);
	refillBucket(bucket);

	if (bucket.tokens <= 0) {
		const waitMs = Math.ceil(
			(REFILL_INTERVAL_MS / REFILL_RATE) * (1 - bucket.tokens / MAX_TOKENS),
		);
		logger.debug("Shopify rate limit wait", { storeId, waitMs });
		await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 1000)));
		return acquireToken(storeId); // Retry after wait
	}

	bucket.tokens -= 1;
}

// ─── Shopify Admin API client ───────────────────────────────────

export interface ShopifyProduct {
	id: number;
	title: string;
	body_html?: string;
	vendor?: string;
	product_type?: string;
	handle?: string;
	status?: string;
	variants: ShopifyVariant[];
	images: ShopifyImage[];
	options: ShopifyOption[];
	created_at: string;
	updated_at: string;
	published_at?: string;
}

export interface ShopifyVariant {
	id: number;
	product_id: number;
	title: string;
	sku?: string;
	price: string;
	compare_at_price?: string;
	inventory_quantity: number;
	inventory_item_id?: number;
	requires_shipping?: boolean;
	taxable?: boolean;
	barcode?: string;
	weight?: number;
	weight_unit?: string;
	created_at: string;
	updated_at: string;
}

export interface ShopifyImage {
	id: number;
	product_id: number;
	src: string;
	width?: number;
	height?: number;
	alt?: string;
	position?: number;
}

export interface ShopifyOption {
	id: number;
	product_id: number;
	name: string;
	position: number;
	values: string[];
}

export interface ShopifyCollection {
	id: number;
	title: string;
	handle: string;
	body_html?: string;
	image?: { src: string };
	published_at?: string;
	updated_at: string;
}

export interface ShopifyWebhook {
	id: number;
	topic: string;
	address: string;
	format: string;
	created_at: string;
	updated_at: string;
}

export interface ShopifyGraphQLResponse<T> {
	data?: T;
	errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

class ShopifyAdminClient {
	private readonly baseUrl: string;
	private readonly storeId: string;
	private accessToken: string | null = null;

	constructor(shop: string, storeId: string) {
		const cleanShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
		this.baseUrl = `https://${cleanShop}/admin/api/2024-10`;
		this.storeId = storeId;
	}

	/** Ensure the access token is loaded and cached */
	private async ensureToken(): Promise<string> {
		if (!this.accessToken) {
			const token = await getStoreAccessToken(this.storeId);
			if (!token) throw new Error(`No access token for Shopify store ${this.storeId}`);
			this.accessToken = token;
		}
		return this.accessToken;
	}

	/** Perform a REST API GET request */
	async get<T>(path: string, params?: URLSearchParams): Promise<T> {
		await acquireToken(this.storeId);
		const token = await this.ensureToken();

		const url = `${this.baseUrl}${path}${params ? `?${params.toString()}` : ""}`;
		const response = await fetch(url, {
			headers: {
				"X-Shopify-Access-Token": token,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			throw new Error(`Shopify GET ${path} failed: ${response.status} ${body}`);
		}

		return response.json() as Promise<T>;
	}

	/** Perform a REST API POST request */
	async post<T>(path: string, body: unknown): Promise<T> {
		await acquireToken(this.storeId);
		const token = await this.ensureToken();

		const url = `${this.baseUrl}${path}`;
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"X-Shopify-Access-Token": token,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			throw new Error(`Shopify POST ${path} failed: ${response.status} ${body}`);
		}

		return response.json() as Promise<T>;
	}

	/** Perform a REST API DELETE request */
	async delete(path: string): Promise<void> {
		await acquireToken(this.storeId);
		const token = await this.ensureToken();

		const response = await fetch(`${this.baseUrl}${path}`, {
			method: "DELETE",
			headers: { "X-Shopify-Access-Token": token },
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			throw new Error(`Shopify DELETE ${path} failed: ${response.status} ${body}`);
		}
	}

	/** Execute a GraphQL query */
	async graphql<T>(
		query: string,
		variables?: Record<string, unknown>,
	): Promise<ShopifyGraphQLResponse<T>> {
		await acquireToken(this.storeId);
		const token = await this.ensureToken();

		const response = await fetch(`${this.baseUrl}/graphql.json`, {
			method: "POST",
			headers: {
				"X-Shopify-Access-Token": token,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ query, variables }),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			throw new Error(`Shopify GraphQL failed: ${response.status} ${body}`);
		}

		return response.json() as Promise<ShopifyGraphQLResponse<T>>;
	}

	// ─── Product operations ───────────────────────────────────

	/** List all products with pagination */
	async listProducts(params?: {
		limit?: number;
		sinceId?: number;
		status?: "active" | "archived" | "draft" | "any";
	}): Promise<{
		products: ShopifyProduct[];
	}> {
		const searchParams = new URLSearchParams();
		searchParams.set("limit", String(params?.limit ?? 50));
		if (params?.sinceId) searchParams.set("since_id", String(params.sinceId));
		if (params?.status) searchParams.set("status", params.status);

		return this.get<{ products: ShopifyProduct[] }>("/products.json", searchParams);
	}

	/** Get a single product by ID */
	async getProduct(productId: number): Promise<{ product: ShopifyProduct }> {
		return this.get<{ product: ShopifyProduct }>(`/products/${productId}.json`);
	}

	/** List collections (custom + smart) */
	async listCustomCollections(): Promise<{ custom_collections: ShopifyCollection[] }> {
		return this.get<{ custom_collections: ShopifyCollection[] }>(
			"/custom_collections.json",
			new URLSearchParams({ limit: "250" }),
		);
	}

	/** Register a webhook */
	async registerWebhook(topic: string, address: string): Promise<void> {
		await this.post("/webhooks.json", {
			webhook: {
				topic,
				address,
				format: "json",
			},
		});
		logger.info("Shopify webhook registered", { topic, address });
	}

	/** List registered webhooks */
	async listWebhooks(): Promise<{ webhooks: ShopifyWebhook[] }> {
		return this.get<{ webhooks: ShopifyWebhook[] }>("/webhooks.json");
	}

	/** Delete a webhook */
	async deleteWebhook(webhookId: number): Promise<void> {
		await this.delete(`/webhooks/${webhookId}.json`);
	}

	/** Fetch store information (name, email, domain) */
	async getShopInfo(): Promise<{
		shop: { name: string; email: string; domain: string; myshopify_domain: string };
	}> {
		return this.get<{
			shop: { name: string; email: string; domain: string; myshopify_domain: string };
		}>("/shop.json");
	}
}

/** Create a Shopify Admin API client for a given store */
export function createShopifyClient(shop: string, storeId: string): ShopifyAdminClient {
	return new ShopifyAdminClient(shop, storeId);
}
