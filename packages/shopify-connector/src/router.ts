/**
 * Shopify OAuth Hono routes — install redirect, callback, status, sync endpoints.
 *
 * Routes:
 *   GET  /api/shopify/install?shop=...&organizationId=...
 *        -> Redirect merchant to Shopify OAuth authorization
 *   GET  /api/shopify/callback?shop=...&code=...&hmac=...&state=...
 *        -> OAuth callback, exchanges code for token, stores in DB
 *   GET  /api/shopify/:storeId/status
 *        -> Get store connection status
 *   POST /api/shopify/:storeId/sync
 *        -> Trigger full product + variant sync
 *   POST /api/shopify/:storeId/sync/delta
 *        -> Trigger delta sync (updated since last sync)
 *   POST /api/shopify/webhooks/app/uninstalled
 *        -> Shopify app uninstall webhook
 */

import { logger } from "@repo/logs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { createShopifyClient } from "./client";
import { buildInstallUrl, exchangeToken, markStoreUninstalled, saveShopifyStore } from "./oauth";
import { runDeltaSync, runFullSync } from "./sync";
import { verifyWebhookHmac } from "./webhook-verifier";
import { handleWebhook, registerStoreWebhooks } from "./webhooks";

// ─── Config ─────────────────────────────────────────────────────

interface ShopifyEnvConfig {
	apiKey: string;
	apiSecret: string;
	redirectUri: string;
}

function getOAuthConfig(): ShopifyEnvConfig {
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
		.regex(/\\.myshopify\\.com$/, "Invalid Shopify shop domain"),
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
			const client = createShopifyClient(shop, shop, tokenResult.accessToken);
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

			// Register webhooks in the background
			const webhookBaseUrl =
				process.env.SHOPIFY_WEBHOOK_BASE_URL ||
				process.env.NEXT_PUBLIC_SAAS_URL ||
				"http://localhost:3000";
			void registerStoreWebhooks(client, webhookBaseUrl);

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
			const { db } = await import("@repo/database");
			const store = await db.shopifyStore.findUnique({
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

			if (!store) return c.json({ error: "store_not_found" }, 404);
			return c.json(store);
		} catch (error) {
			logger.error("Shopify status check failed", { error });
			return c.json({ error: "status_failed" }, 500);
		}
	})

	// POST /api/shopify/:storeId/sync — trigger full product sync
	.post("/shopify/:storeId/sync", async (c) => {
		try {
			const storeId = c.req.param("storeId");
			const { db } = await import("@repo/database");

			const store = await db.shopifyStore.findUnique({
				where: { id: storeId },
				select: {
					id: true,
					shop: true,
					organizationId: true,
					indexId: true,
					syncStatus: true,
				},
			});

			if (!store) return c.json({ error: "store_not_found" }, 404);
			if (!store.indexId) {
				return c.json(
					{ error: "no_index_configured", message: "Connect a search index first" },
					400,
				);
			}
			if (store.syncStatus === "syncing") {
				return c.json(
					{ error: "sync_in_progress", message: "A sync is already running" },
					409,
				);
			}

			// Mark store as syncing
			await db.shopifyStore.update({
				where: { id: storeId },
				data: { syncStatus: "syncing", syncError: null },
			});

			// Create the authenticated client
			const client = createShopifyClient(store.shop, store.id);

			// Run sync in background
			runFullSync(client, {
				shop: store.shop,
				indexId: store.indexId,
				organizationId: store.organizationId,
				includeMetafields: true,
			})
				.then(async (result) => {
					await db.shopifyStore.update({
						where: { id: storeId },
						data: {
							syncStatus: result.failuresCount > 0 ? "error" : "active",
							lastSyncAt: new Date(),
							syncError: result.failuresCount > 0 ? result.errors.join("; ") : null,
						},
					});

					logger.info("Shopify full sync completed via route", {
						storeId,
						itemsCount: result.itemsCount,
						failuresCount: result.failuresCount,
					});
				})
				.catch(async (err) => {
					const msg = err instanceof Error ? err.message : String(err);

					await db.shopifyStore.update({
						where: { id: storeId },
						data: { syncStatus: "error", syncError: msg },
					});

					logger.error("Shopify full sync route failed", { storeId, error: msg });
				});

			return c.json({
				status: "sync_started",
				type: "full",
				message:
					"Full product sync started. Check status via GET /api/shopify/:storeId/status",
			});
		} catch (error) {
			logger.error("Shopify sync trigger failed", { error });
			return c.json(
				{
					error: "sync_trigger_failed",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	})

	// POST /api/shopify/:storeId/sync/delta — trigger delta sync
	.post("/shopify/:storeId/sync/delta", async (c) => {
		try {
			const storeId = c.req.param("storeId");
			const { db } = await import("@repo/database");

			const store = await db.shopifyStore.findUnique({
				where: { id: storeId },
				select: {
					id: true,
					shop: true,
					organizationId: true,
					indexId: true,
					lastSyncAt: true,
					syncStatus: true,
				},
			});

			if (!store) return c.json({ error: "store_not_found" }, 404);
			if (!store.indexId) {
				return c.json(
					{ error: "no_index_configured", message: "Connect a search index first" },
					400,
				);
			}
			if (store.syncStatus === "syncing") {
				return c.json(
					{ error: "sync_in_progress", message: "A sync is already running" },
					409,
				);
			}

			// Mark store as syncing
			await db.shopifyStore.update({
				where: { id: storeId },
				data: { syncStatus: "syncing", syncError: null },
			});

			// Default to 24h ago if never synced
			const updatedSince =
				store.lastSyncAt?.toISOString() ??
				new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

			// Create the authenticated client
			const client = createShopifyClient(store.shop, store.id);

			// Run delta sync in background
			runDeltaSync(client, {
				shop: store.shop,
				indexId: store.indexId,
				organizationId: store.organizationId,
				updatedSince,
				includeMetafields: true,
			})
				.then(async (result) => {
					await db.shopifyStore.update({
						where: { id: storeId },
						data: {
							syncStatus: result.failuresCount > 0 ? "error" : "active",
							lastSyncAt: new Date(),
							syncError: result.failuresCount > 0 ? result.errors.join("; ") : null,
						},
					});

					logger.info("Shopify delta sync completed via route", {
						storeId,
						itemsCount: result.itemsCount,
						updatedSince,
					});
				})
				.catch(async (err) => {
					const msg = err instanceof Error ? err.message : String(err);

					await db.shopifyStore.update({
						where: { id: storeId },
						data: { syncStatus: "error", syncError: msg },
					});

					logger.error("Shopify delta sync route failed", { storeId, error: msg });
				});

			return c.json({
				status: "delta_sync_started",
				type: "delta",
				since: updatedSince,
				message:
					"Delta sync started. Only products updated since the last sync will be indexed.",
			});
		} catch (error) {
			logger.error("Shopify delta sync trigger failed", { error });
			return c.json(
				{
					error: "delta_sync_trigger_failed",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	})

	// POST /api/shopify/webhook — general webhook handler for product/collection events
	.post("/shopify/webhook", async (c) => {
		try {
			const hmacHeader = c.req.header("X-Shopify-Hmac-Sha256");
			const topic = c.req.header("X-Shopify-Topic");
			const shop = c.req.header("X-Shopify-Shop-Domain");

			if (!hmacHeader || !topic || !shop) {
				logger.warn("Shopify webhook missing required headers", {
					hasHmac: !!hmacHeader,
					hasTopic: !!topic,
					hasShop: !!shop,
				});
				return c.json({ error: "missing_headers" }, 400);
			}

			// Read raw body for HMAC verification
			const body = await c.req.text().catch(() => "");
			if (!body) {
				return c.json({ error: "empty_body" }, 400);
			}

			// Verify HMAC signature
			if (!verifyWebhookHmac(body, hmacHeader)) {
				logger.warn("Shopify webhook HMAC verification failed", {
					shop,
					topic,
				});
				return c.json({ error: "hmac_verification_failed" }, 401);
			}

			// Parse JSON body
			let parsedBody: Record<string, unknown>;
			try {
				parsedBody = JSON.parse(body) as Record<string, unknown>;
			} catch {
				return c.json({ error: "invalid_json" }, 400);
			}

			// Process the webhook asynchronously (don't block the response)
			void handleWebhook(topic, shop, parsedBody);

			return c.json({ status: "queued" });
		} catch (error) {
			logger.error("Shopify webhook handler failed", { error });
			return c.json({ status: "error" }, 500);
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
