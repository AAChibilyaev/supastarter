/**
 * Shopify OAuth 2.0 flow — install, callback, token exchange.
 *
 * Implements the Shopify OAuth access token flow:
 * 1. Generate install URL → merchant clicks → redirected to Shopify
 * 2. Merchant authorizes → Shopify redirects to callback with code + shop + hmac
 * 3. Callback verifies HMAC, exchanges code for access token, stores encrypted
 *
 * Docs: https://shopify.dev/docs/apps/auth/oauth/access-token-types/online
 */

import { db } from "@repo/database";
import { logger } from "@repo/logs";

import { decryptToken, encryptToken } from "./crypto";
import type { ShopifyOAuthConfig, ShopifyTokenResult } from "./types";

// ─── OAuth URL generation ───────────────────────────────────────

/** Generate the Shopify OAuth install URL for a given shop domain */
export function buildInstallUrl(config: ShopifyOAuthConfig, shop: string): string {
	const params = new URLSearchParams({
		client_id: config.apiKey,
		scope: "read_products,write_products,read_inventory,write_inventory,read_locations",
		redirect_uri: config.redirectUri,
		state: shop, // Use shop domain as state for CSRF protection
		"grant_options[]": "per-user",
	});

	const cleanShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
	return `https://${cleanShop}/admin/oauth/authorize?${params.toString()}`;
}

// ─── Token exchange ─────────────────────────────────────────────

/** Exchange the OAuth authorization code for a permanent access token */
export async function exchangeToken(
	config: ShopifyOAuthConfig,
	shop: string,
	code: string,
): Promise<ShopifyTokenResult> {
	const cleanShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
	const url = `https://${cleanShop}/admin/oauth/access_token`;

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json" },
		body: JSON.stringify({
			client_id: config.apiKey,
			client_secret: config.apiSecret,
			code,
		}),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		logger.error("Shopify token exchange failed", {
			status: response.status,
			shop: cleanShop,
			body,
		});
		throw new Error(`Shopify token exchange failed: ${response.status} ${body}`);
	}

	const data = (await response.json()) as {
		access_token: string;
		scope: string;
	};

	return {
		accessToken: data.access_token,
		scopes: data.scope,
		shop: cleanShop,
	};
}

// ─── Token storage ──────────────────────────────────────────────

export interface StoredShopifyStore {
	id: string;
	organizationId: string;
	indexId: string | null;
	shop: string;
	name: string | null;
	email: string | null;
	domain: string | null;
	syncStatus: string;
	syncError: string | null;
	installedAt: Date;
	lastSyncAt: Date | null;
	metadata: Record<string, unknown>;
}

/** Store a new Shopify store connection with encrypted token */
export async function saveShopifyStore(params: {
	organizationId: string;
	indexId?: string;
	shop: string;
	accessToken: string;
	scopes: string;
	name?: string;
	email?: string;
	domain?: string;
}): Promise<StoredShopifyStore> {
	const encryptedToken = encryptToken(params.accessToken);

	const store = await db.shopifyStore.upsert({
		where: { shop: params.shop },
		create: {
			organizationId: params.organizationId,
			indexId: params.indexId ?? null,
			shop: params.shop,
			accessToken: encryptedToken,
			scopes: params.scopes,
			name: params.name ?? null,
			email: params.email ?? null,
			domain: params.domain ?? null,
			syncStatus: "pending",
		},
		update: {
			accessToken: encryptedToken,
			scopes: params.scopes,
			name: params.name ?? null,
			email: params.email ?? null,
			domain: params.domain ?? null,
			uninstalledAt: null,
			syncStatus: "pending",
			syncError: null,
		},
	});

	return store as unknown as StoredShopifyStore;
}

/** Get a Shopify store's decrypted access token */
export async function getStoreAccessToken(storeId: string): Promise<string | null> {
	const store = await db.shopifyStore.findUnique({
		where: { id: storeId },
		select: { accessToken: true },
	});

	if (!store) return null;

	try {
		return decryptToken(store.accessToken);
	} catch (error) {
		logger.error("Failed to decrypt Shopify token", { storeId, error });
		return null;
	}
}

/** List all active Shopify stores for an organization */
export async function listOrganizationStores(
	organizationId: string,
): Promise<StoredShopifyStore[]> {
	const stores = await db.shopifyStore.findMany({
		where: {
			organizationId,
			uninstalledAt: null,
		},
		orderBy: { installedAt: "desc" },
	});

	return stores as unknown as StoredShopifyStore[];
}

/** Mark a Shopify store as uninstalled */
export async function markStoreUninstalled(shop: string): Promise<void> {
	await db.shopifyStore.update({
		where: { shop },
		data: {
			uninstalledAt: new Date(),
			syncStatus: "uninstalled",
		},
	});

	logger.info("Shopify store marked uninstalled", { shop });
}

/** Get a store by its Shopify shop domain */
export async function getStoreByShop(shop: string): Promise<StoredShopifyStore | null> {
	const store = await db.shopifyStore.findUnique({
		where: { shop },
	});
	return store as unknown as StoredShopifyStore | null;
}
