/**
 * Shopify Connector — types and constants
 */

/** Shopify OAuth scopes for product + inventory sync */
export const SHOPIFY_DEFAULT_SCOPES = [
	"read_products",
	"write_products",
	"read_inventory",
	"write_inventory",
	"read_locations",
] as const;

export type ShopifyScope = (typeof SHOPIFY_DEFAULT_SCOPES)[number];

export interface ShopifyOAuthConfig {
	apiKey: string;
	apiSecret: string;
	redirectUri: string;
}

/** Result of a successful Shopify OAuth token exchange */
export interface ShopifyTokenResult {
	accessToken: string;
	scopes: string;
	shop: string;
}

/** Shopify Admin API rate limits: 40 req/s per store, 2 req/s burst */
export const SHOPIFY_RATE_LIMIT = {
	requestsPerSecond: 40,
	burstLimit: 2,
} as const;

/** Shopify API versions */
export const SHOPIFY_API_VERSION = "2024-10" as const;

/** Sync statuses matching ShopifyStore model */
export type ShopifySyncStatus = "pending" | "syncing" | "active" | "error" | "uninstalled";
