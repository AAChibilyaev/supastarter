/**
 * Shopify OAuth Hono routes — install redirect, callback, status endpoints.
 *
 * Routes:
 *   GET  /api/shopify/install?shop=...&organizationId=...
 *        → Redirect merchant to Shopify OAuth authorization
 *   GET  /api/shopify/callback?shop=...&code=...&hmac=...&state=...
 *        → OAuth callback, exchanges code for token, stores in DB
 *   GET  /api/shopify/:storeId/status
 *        → Get store connection status
 *   POST /api/shopify/webhooks/app/uninstalled
 *        → Shopify app uninstall webhook
 */

import { logger } from "@repo/logs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { createShopifyClient } from "./client";
import {
	buildInstallUrl,
	exchangeToken,
	getStoreByShop,
	markStoreUninstalled,
	saveShopifyStore,
} from "./oauth";
import type { ShopifyOAuthConfig } from "./types";

// ─── Config ─────────────────────────────────────────────────────

function getOAuthConfig(): ShopifyOAuthConfig {
	const apiKey = process.env.SHOPIFY_API_KEY;
	const apiSecret = process.env.SHOPIFY_API_SECRET;
	const redirectUri = process.env.SHOPIFY_REDIRECT_URI;

	if (!apiKey || !apiSecret || !redirectUri) {
		throw new Error(
			"Missing Shopify environment variables. " +
				"Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and SHOPIFY_REDIRECT_URI.",
		);
	}

	return { apiKey, apiSecret, redirectUri };
}

// ─── Zod schemas ────────────────────────────────────────────────

const installQuerySchema = z.object({
	shop: z
		.string()
		.min(1)
		.regex(/\.myshopify\.com$/, "Invalid Shopify shop domain"),
	organizationId: z.string().min(1),
});

const callbackQuerySchema = z.object({
	shop: z.string().min(1),
	code: z.string().min(1),
	hmac: z.string().min(1),
	state: z.string().optional(),
	timestamp: z.string().optional(),
});

// ─── Router ─────────────────────────────────────────────────────

export const shopifyApp = new Hono()
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["GET", "POST", "OPTIONS"],
		}),
	)

	// GET /api/shopify/install — redirect merchant to Shopify OAuth
	.get("/shopify/install", async (c) => {
		try {
			const rawQuery = c.req.query();
			const parsed = installQuerySchema.safeParse(rawQuery);

			if (!parsed.success) {
				return c.json({ error: "invalid_query", details: parsed.error.issues }, 400);
			}

			const config = getOAuthConfig();
			const url = buildInstallUrl(config, parsed.data.shop);

			logger.info("Shopify install redirect", {
				shop: parsed.data.shop,
				organizationId: parsed.data.organizationId,
			});

			return c.redirect(url, 302);
		} catch (error) {
			logger.error("Shopify install failed", { error });
			return c.json(
				{
					error: "install_failed",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	})

	// GET /api/shopify/callback — OAuth callback from Shopify
	.get("/shopify/callback", async (c) => {
		try {
			const rawQuery = c.req.query();
			const parsed = callbackQuerySchema.safeParse(rawQuery);

			if (!parsed.success) {
				return c.json({ error: "invalid_query", details: parsed.error.issues }, 400);
			}

			const config = getOAuthConfig();
			const { shop, code, state } = parsed.data;

			// Exchange code for access token
			const tokenResult = await exchangeToken(config, shop, code);

			// Fetch store details
			const client = createShopifyClient(shop, "__temp__");
			let shopInfo: { name?: string; email?: string; domain?: string } = {};
			try {
				const info = await client.getShopInfo();
				shopInfo = {
					name: info.shop.name,
					email: info.shop.email,
					domain: info.shop.domain,
				};
			} catch {
				logger.warn("Could not fetch Shopify shop info after install", { shop });
			}

			// Parse organization ID from state parameter (passed during install)
			const organizationId = state && state.includes("org_") ? state : "__pending__";

			// Store the connection with encrypted token
			const store = await saveShopifyStore({
				organizationId,
				shop,
				accessToken: tokenResult.accessToken,
				scopes: tokenResult.scopes,
				name: shopInfo.name,
				email: shopInfo.email,
				domain: shopInfo.domain,
			});

			logger.info("Shopify store installed successfully", {
				storeId: store.id,
				shop,
				organizationId: store.organizationId,
			});

			// Redirect merchant back to the dashboard
			const baseUrl = process.env.NEXT_PUBLIC_SAAS_URL || "http://localhost:3000";
			return c.redirect(
				`${baseUrl}/dashboard/settings/connectors?shopify=installed&storeId=${store.id}`,
				302,
			);
		} catch (error) {
			logger.error("Shopify callback failed", { error });
			return c.json(
				{
					error: "oauth_callback_failed",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	})

	// GET /api/shopify/:storeId/status — get store connection status
	.get("/shopify/:storeId/status", async (c) => {
		try {
			const storeId = c.req.param("storeId");
			const store = await getStoreByShop(storeId);

			if (!store) {
				// Try by ID
				const { db } = await import("@repo/database");
				const found = await db.shopifyStore.findUnique({
					where: { id: storeId },
					select: {
						id: true,
						shop: true,
						name: true,
						syncStatus: true,
						installedAt: true,
						lastSyncAt: true,
						syncError: true,
						organizationId: true,
					},
				});
				if (!found) return c.json({ error: "store_not_found" }, 404);
				return c.json(found);
			}

			return c.json({
				id: store.id,
				shop: store.shop,
				name: store.name,
				syncStatus: store.syncStatus,
				installedAt: store.installedAt,
				lastSyncAt: store.lastSyncAt,
				syncError: store.syncError,
				organizationId: store.organizationId,
			});
		} catch (error) {
			logger.error("Shopify status check failed", { error });
			return c.json({ error: "status_failed" }, 500);
		}
	})

	// POST /api/shopify/webhooks/app/uninstalled — Shopify app uninstall webhook
	.post("/shopify/webhooks/app/uninstalled", async (c) => {
		try {
			const body = await c.req.json().catch(() => null);
			if (!body) return c.json({ error: "invalid_json" }, 400);

			const shop = body.myshopify_domain || body.domain || body.shop;
			if (!shop) return c.json({ error: "missing_shop" }, 400);

			await markStoreUninstalled(shop);
			logger.info("Shopify app uninstalled", { shop });

			return c.json({ status: "ok" });
		} catch (error) {
			logger.error("Shopify uninstall webhook failed", { error });
			return c.json({ status: "error" }, 500);
		}
	});
