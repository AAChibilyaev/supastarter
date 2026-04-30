/**
 * Connector API — called by CMS modules (PrestaShop, Bitrix).
 *
 * Auth: Bearer token (ss_connector_* prefix, hashed in SearchApiKey).
 * Tokens are created from the dashboard and have scoped write access.
 *
 * All endpoints are public (no session required) — auth is via bearer token.
 * All payloads are validated with Zod.
 */

import { db, enqueueManySearchIngest, type Prisma } from "@repo/database";
import { logger } from "@repo/logs";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { getConnectorDefinition } from "./lib/connectors/runtime";
import { completeSyncJob, createSyncJob, failSyncJob } from "./lib/sync-jobs";

// ─── Auth middleware ─────────────────────────────────────────────

interface VerifiedConnector {
	keyId: string;
	indexId: string;
	organizationId: string;
	indexSlug: string;
}

async function gateConnectorRequest(c: Context): Promise<VerifiedConnector | Response> {
	const auth = c.req.header("Authorization");
	if (!auth?.startsWith("Bearer ")) {
		return c.json({ error: "missing_bearer_token" }, 401);
	}

	const token = auth.slice(7);
	const prefix = token.length >= 20 ? token.slice(0, 8) : token.slice(0, 4);

	const keys = await db.searchApiKey.findMany({
		where: {
			prefix,
			revokedAt: null,
			scopes: { has: "connector_write" },
		},
		include: {
			index: { select: { id: true, slug: true, organizationId: true } },
		},
	});

	if (keys.length === 0) {
		return c.json({ error: "invalid_or_revoked_key" }, 403);
	}

	const crypto = await import("node:crypto");
	let matched: (typeof keys)[number] | undefined;

	for (const k of keys) {
		const parts = k.hash.split(":");
		if (parts.length !== 2) continue;
		const [salt, storedHash] = parts;
		const computedHash = crypto
			.createHash("sha256")
			.update(salt + token)
			.digest("hex");
		if (computedHash === storedHash) {
			matched = k;
			break;
		}
	}

	if (!matched) {
		return c.json({ error: "invalid_or_revoked_key" }, 403);
	}

	// Touch lastUsedAt (non-blocking)
	void db.searchApiKey
		.update({ where: { id: matched.id }, data: { lastUsedAt: new Date() } })
		.catch((err: Error) =>
			logger.warn("Failed to update key lastUsedAt", { keyId: matched?.id, err }),
		);

	return {
		keyId: matched.id,
		indexId: matched.index.id,
		organizationId: matched.index.organizationId,
		indexSlug: matched.index.slug,
	};
}

// ─── Zod schemas ────────────────────────────────────────────────

const handshakeSchema = z.object({
	moduleVersion: z.string(),
	platform: z.enum(["prestashop", "bitrix"]),
});

const syncProductSchema = z.object({
	external_id: z.string(),
	title: z.string(),
	description: z.string().optional().default(""),
	sku: z.string().optional().default(""),
	brand: z.string().optional().default(""),
	categories: z.array(z.string()).optional().default([]),
	category_ids: z.array(z.string()).optional().default([]),
	tags: z.array(z.string()).optional().default([]),
	price: z.number().optional().default(0),
	sale_price: z.number().optional(),
	currency: z.string().optional().default("USD"),
	image_url: z.string().optional().default(""),
	product_url: z.string().optional().default(""),
	availability: z.enum(["in_stock", "out_of_stock", "preorder"]).optional().default("in_stock"),
	stock_quantity: z.number().int().optional().default(-1),
	attributes: z.record(z.string(), z.unknown()).optional().default({}),
	locale: z.string().optional().default("en"),
	created_at: z.number().int().optional(),
	updated_at: z.number().int().optional(),
});

const fullSyncSchema = z.object({
	products: z.array(syncProductSchema).min(1).max(1000),
});

const deltaSyncSchema = z.object({
	products: z.array(syncProductSchema).min(1).max(100),
});

const diagnosticsSchema = z.object({
	moduleVersion: z.string(),
	lastFullSync: z.string().optional(),
	lastDeltaSync: z.string().optional(),
	totalProducts: z.number().int().optional(),
	errors: z
		.array(z.object({ code: z.string(), message: z.string(), timestamp: z.string() }))
		.optional(),
	phpVersion: z.string().optional(),
	shopUrl: z.string().optional(),
});

// ─── Helpers ────────────────────────────────────────────────────

function normalizeProduct(p: z.infer<typeof syncProductSchema>) {
	return {
		project_id: "",
		external_id: p.external_id,
		title: p.title,
		description: p.description,
		sku: p.sku,
		brand: p.brand,
		categories: p.categories,
		category_ids: p.category_ids,
		tags: p.tags,
		price: p.price,
		sale_price: p.sale_price ?? p.price,
		currency: p.currency,
		image_url: p.image_url,
		product_url: p.product_url,
		availability: p.availability,
		stock_quantity: p.stock_quantity,
		attributes: p.attributes,
		locale: p.locale,
		created_at: p.created_at ?? Math.floor(Date.now() / 1000),
		updated_at: p.updated_at ?? Math.floor(Date.now() / 1000),
	};
}

// ─── Routes ─────────────────────────────────────────────────────

export const connectorApp = new Hono()
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["POST", "GET", "DELETE", "OPTIONS"],
		}),
	)

	// POST /api/connectors/handshake
	.post("/connectors/handshake", async (c) => {
		const verified = await gateConnectorRequest(c);
		if (verified instanceof Response) return verified;

		const body = await c.req.json().catch(() => null);
		if (!body) return c.json({ error: "invalid_json" }, 400);

		const parsed = handshakeSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
		}

		const connector = getConnectorDefinition(parsed.data.platform);
		if (!connector) {
			return c.json({ error: "unsupported_connector" }, 400);
		}

		return c.json({
			projectId: verified.organizationId,
			indexSlug: verified.indexSlug,
			status: "active",
			connector: {
				id: connector.id,
				displayName: connector.displayName,
				syncModes: connector.syncModes,
				capabilities: connector.capabilities,
				minModuleVersion: connector.minModuleVersion,
			},
		});
	})

	// POST /api/connectors/:connectorId/heartbeat
	.post("/connectors/:connectorId/heartbeat", async (c) => {
		const verified = await gateConnectorRequest(c);
		if (verified instanceof Response) return verified;
		return c.json({ status: "ok", timestamp: new Date().toISOString() });
	})

	// POST /api/projects/:projectId/sync/full
	.post("/projects/:projectId/sync/full", async (c) => {
		const verified = await gateConnectorRequest(c);
		if (verified instanceof Response) return verified;

		if (c.req.param("projectId") !== verified.organizationId) {
			return c.json({ error: "project_not_found" }, 404);
		}

		const body = await c.req.json().catch(() => null);
		if (!body) return c.json({ error: "invalid_json" }, 400);

		const parsed = fullSyncSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
		}

		const docs = parsed.data.products.map(normalizeProduct);
		const job = await createSyncJob({
			type: "full",
			indexId: verified.indexId,
			organizationId: verified.organizationId,
		});

		try {
			await enqueueManySearchIngest(
				verified.indexId,
				verified.organizationId,
				"upsert",
				docs as Prisma.InputJsonValue[],
			);
			await completeSyncJob(job.id, { itemsCount: docs.length });
		} catch (error) {
			logger.error("Full sync enqueue failed", { error, projectId: verified.organizationId });
			await failSyncJob(job.id, error instanceof Error ? error.message : "sync_failed");
			return c.json({ error: "sync_failed" }, 502);
		}

		return c.json({
			status: "accepted",
			itemsCount: docs.length,
			jobId: job.id,
		});
	})

	// POST /api/projects/:projectId/sync/delta
	.post("/projects/:projectId/sync/delta", async (c) => {
		const verified = await gateConnectorRequest(c);
		if (verified instanceof Response) return verified;

		if (c.req.param("projectId") !== verified.organizationId) {
			return c.json({ error: "project_not_found" }, 404);
		}

		const body = await c.req.json().catch(() => null);
		if (!body) return c.json({ error: "invalid_json" }, 400);

		const parsed = deltaSyncSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
		}

		const docs = parsed.data.products.map(normalizeProduct);
		const job = await createSyncJob({
			type: "delta",
			indexId: verified.indexId,
			organizationId: verified.organizationId,
		});

		try {
			await enqueueManySearchIngest(
				verified.indexId,
				verified.organizationId,
				"upsert",
				docs as Prisma.InputJsonValue[],
			);
			await completeSyncJob(job.id, { itemsCount: docs.length });
		} catch (error) {
			logger.error("Delta sync enqueue failed", {
				error,
				projectId: verified.organizationId,
			});
			await failSyncJob(job.id, error instanceof Error ? error.message : "sync_failed");
			return c.json({ error: "sync_failed" }, 502);
		}

		return c.json({ status: "accepted", itemsProcessed: docs.length, jobId: job.id });
	})

	// DELETE /api/projects/:projectId/products/:externalId
	.delete("/projects/:projectId/products/:externalId", async (c) => {
		const verified = await gateConnectorRequest(c);
		if (verified instanceof Response) return verified;

		if (c.req.param("projectId") !== verified.organizationId) {
			return c.json({ error: "project_not_found" }, 404);
		}

		const externalId = c.req.param("externalId");
		try {
			await enqueueManySearchIngest(verified.indexId, verified.organizationId, "delete", [
				{ external_id: externalId },
			] as Prisma.InputJsonValue[]);
		} catch (error) {
			logger.error("Product delete failed", {
				error,
				externalId,
				projectId: verified.organizationId,
			});
			return c.json({ error: "delete_failed" }, 502);
		}

		return c.json({ status: "deleted", externalId });
	})

	// POST /api/projects/:projectId/diagnostics
	.post("/projects/:projectId/diagnostics", async (c) => {
		const verified = await gateConnectorRequest(c);
		if (verified instanceof Response) return verified;

		if (c.req.param("projectId") !== verified.organizationId) {
			return c.json({ error: "project_not_found" }, 404);
		}

		const body = await c.req.json().catch(() => null);
		if (!body) return c.json({ error: "invalid_json" }, 400);

		const parsed = diagnosticsSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
		}

		logger.info("Connector diagnostics", {
			projectId: verified.organizationId,
			keyId: verified.keyId,
			...parsed.data,
		});

		return c.json({ status: "ok", receivedAt: new Date().toISOString() });
	});
