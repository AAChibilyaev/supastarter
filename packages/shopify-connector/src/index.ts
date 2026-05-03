/**
 * Shopify Connector — server-side connector for Shopify e-commerce.
 *
 * Features:
 * - OAuth 2.0 install flow
 * - Encrypted token storage (AES-256-GCM)
 * - Shopify Admin API client (REST + GraphQL) with rate limiting
 * - Product, variant, inventory, category sync
 * - Real-time webhook handling
 *
 * Architecture: server-side (hosted in AACsearch), unlike PHP CMS modules.
 */

export { shopifyApp } from "./router";
export {
	buildInstallUrl,
	exchangeToken,
	saveShopifyStore,
	getStoreAccessToken,
	listOrganizationStores,
	markStoreUninstalled,
	getStoreByShop,
} from "./oauth";
export { createShopifyClient } from "./client";
export { encryptToken, decryptToken } from "./crypto";
export type { ShopifyOAuthConfig, ShopifyTokenResult, ShopifySyncStatus } from "./types";
export { runFullSync, runDeltaSync } from "./sync";
export type { SyncResult, SyncOptions } from "./sync";
export { flattenProductToDocuments, documentToExternalId, parseExternalId } from "./product-mapper";
export type { AacSearchProductDocument } from "./product-mapper";
export { verifyWebhookHmac } from "./webhook-verifier";
export {
	handleWebhook,
	registerStoreWebhooks,
	deregisterStoreWebhooks,
	WEBHOOK_TOPICS,
	enqueueWebhookEvent,
} from "./webhooks";
export type { WebhookTopic } from "./webhooks";
