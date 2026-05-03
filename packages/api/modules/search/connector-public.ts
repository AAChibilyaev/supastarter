/**
 * Connector API — called by CMS modules (PrestaShop, Bitrix).
 *
 * Auth: Bearer token (ss_connector_* prefix, hashed in SearchApiKey).
 * Tokens are created from the dashboard and have scoped write access.
 *
 * All endpoints are public (no session required) — auth is via bearer token.
 * All payloads are validated with Zod.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { db, enqueueManySearchIngest, recordSearchUsage, type Prisma } from "@repo/database";
import { logger } from "@repo/logs";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { getConnectorDefinition } from "./lib/connectors/runtime";
import { recordDiagnostics } from "./lib/diagnostics-store";
import { completeSyncJob, createSyncJob, failSyncJob, getSyncJob } from "./lib/sync-jobs";

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

	const { createHash } = await import("node:crypto");
	const computedHash = createHash("sha256").update(token).digest("hex");
	const matched = keys.find((k) => k.hash === computedHash);

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
	platform: z.enum(["prestashop", "bitrix", "wordpress", "shopify"]),
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

// ─── Webhook Helpers ────────────────────────────────────────────

interface WebhookSecretConfig {
	secret: string;
	enabled: boolean;
}

/**
 * Read the webhook signing secret from the SearchIndex schema JSON.
 * Stored under the `_webhookConfig` key.
 */
function getWebhookSecretFromSchema(index: {
	schema: Prisma.JsonValue;
}): WebhookSecretConfig | null {
	const rawSchema =
		typeof index.schema === "object" && index.schema !== null
			? (index.schema as Record<string, unknown>)
			: {};
	const webhookConfig = rawSchema._webhookConfig as
		| { secret?: string; enabled?: boolean }
		| undefined;
	if (!webhookConfig?.secret) return null;
	return {
		secret: webhookConfig.secret,
		enabled: webhookConfig.enabled !== false,
	};
}

/**
 * Verify an HMAC-SHA256 webhook signature.
 * Expected header: X-Webhook-Signature: sha256=<hex>
 * Uses constant-time comparison to prevent timing attacks.
 */
function verifyWebhookSignature(
	body: string,
	signatureHeader: string | undefined,
	secret: string,
): boolean {
	if (!signatureHeader) return false;

	// Parse: "sha256=<hex>" or just bare hex
	const prefix = "sha256=";
	let expectedSig: string;
	if (signatureHeader.startsWith(prefix)) {
		expectedSig = signatureHeader.slice(prefix.length);
	} else {
		expectedSig = signatureHeader;
	}

	const computed = createHmac("sha256", secret).update(body).digest("hex");

	try {
		const expectedBuf = Buffer.from(expectedSig, "hex");
		const computedBuf = Buffer.from(computed, "hex");
		if (expectedBuf.length !== computedBuf.length) return false;
		return timingSafeEqual(expectedBuf, computedBuf);
	} catch {
		return false;
	}
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
			void recordSearchUsage({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				type: "sync_job",
				count: docs.length,
				metadata: { jobId: job.id, type: "full", itemsCount: docs.length },
			}).catch((err: Error) =>
				logger.warn("sync_job usage record failed", { err: String(err) }),
			);
		} catch (error) {
			logger.error("Full sync enqueue failed", {
				error: String(error),
				projectId: verified.organizationId,
			});
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
			void recordSearchUsage({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				type: "sync_job",
				count: docs.length,
				metadata: { jobId: job.id, type: "delta", itemsCount: docs.length },
			}).catch((err) => logger.warn("sync_job usage record failed", { err }));
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

	// DELETE /api/connector/documents — batch delete by externalIds
	.delete("/connector/documents", async (c) => {
		const verified = await gateConnectorRequest(c);
		if (verified instanceof Response) return verified;

		const body = await c.req.json().catch(() => null);
		if (!body) return c.json({ error: "invalid_json" }, 400);

		const parsed = z
			.object({
				externalIds: z.array(z.string()).min(1).max(500),
			})
			.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
		}

		try {
			await enqueueManySearchIngest(
				verified.indexId,
				verified.organizationId,
				"delete",
				parsed.data.externalIds.map((id) => ({
					external_id: id,
				})) as Prisma.InputJsonValue[],
			);
		} catch (error) {
			logger.error("Batch delete failed", { error });
			return c.json({ error: "delete_failed" }, 502);
		}

		return c.json({ deleted: parsed.data.externalIds.length });
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

		const stored = recordDiagnostics({
			organizationId: verified.organizationId,
			indexId: verified.indexId,
			report: parsed.data,
		});

		logger.info("Connector diagnostics", {
			projectId: verified.organizationId,
			keyId: verified.keyId,
			...parsed.data,
		});

		return c.json({ status: "ok", receivedAt: stored.receivedAt });
	})

	// GET /api/projects/:projectId/sync/jobs/:jobId
	.get("/projects/:projectId/sync/jobs/:jobId", async (c) => {
		const verified = await gateConnectorRequest(c);
		if (verified instanceof Response) return verified;

		if (c.req.param("projectId") !== verified.organizationId) {
			return c.json({ error: "project_not_found" }, 404);
		}

		const job = await getSyncJob(c.req.param("jobId"), verified.organizationId);
		if (!job) return c.json({ error: "job_not_found" }, 404);
		return c.json(job);
	})

	// ─── Generic Webhook Receiver ────────────────────────────────────

	// POST /api/webhooks/sync/:indexSlug — generic webhook for any service
	.post("/webhooks/sync/:indexSlug", async (c) => {
		const startTime = Date.now();
		try {
			const verified = await gateConnectorRequest(c);
			if (verified instanceof Response) return verified;

			// Verify the slug matches
			const urlSlug = c.req.param("indexSlug");
			if (urlSlug !== verified.indexSlug) {
				return c.json({ error: "slug_mismatch" }, 403);
			}

			// Read raw body for HMAC verification, then parse JSON
			const rawBody = await c.req.text().catch(() => null);
			if (!rawBody) return c.json({ error: "empty_body" }, 400);

			// HMAC-SHA256 signature verification (if webhook secret is configured)
			const index = await db.searchIndex.findUnique({
				where: { id: verified.indexId },
				select: { schema: true },
			});
			const webhookSecret = index ? getWebhookSecretFromSchema(index) : null;
			const signatureHeader = c.req.header("X-Webhook-Signature");

			if (webhookSecret && webhookSecret.enabled) {
				if (!verifyWebhookSignature(rawBody, signatureHeader, webhookSecret.secret)) {
					logger.warn("Webhook signature verification failed", {
						indexSlug: verified.indexSlug,
						organizationId: verified.organizationId,
					});
					return c.json({ error: "invalid_signature" }, 401);
				}
			} else if (signatureHeader) {
				// Signature provided but no secret configured — warn but accept
				logger.warn("Webhook signature header present but no secret configured", {
					indexSlug: verified.indexSlug,
					organizationId: verified.organizationId,
				});
			}

			let body: unknown;
			try {
				body = JSON.parse(rawBody);
			} catch {
				return c.json({ error: "invalid_json" }, 400);
			}

			const parsed = z
				.object({
					action: z.enum(["upsert", "delete"]),
					documents: z
						.array(z.record(z.string(), z.unknown()))
						.max(100)
						.optional()
						.default([]),
					externalIds: z.array(z.string()).max(100).optional().default([]),
				})
				.safeParse(body);

			if (!parsed.success) {
				return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
			}

			const { action, documents, externalIds } = parsed.data;

			// Validate: upsert needs documents, delete needs externalIds
			if (action === "upsert" && documents.length === 0) {
				return c.json({ error: "documents_required_for_upsert" }, 400);
			}
			if (action === "delete" && externalIds.length === 0) {
				return c.json({ error: "externalIds_required_for_delete" }, 400);
			}

			logger.info("Webhook sync received", {
				action,
				documentsCount: documents.length,
				externalIdsCount: externalIds.length,
				indexSlug: verified.indexSlug,
				organizationId: verified.organizationId,
				signatureVerified: webhookSecret?.enabled ? true : false,
			});

			try {
				if (action === "upsert") {
					await enqueueManySearchIngest(
						verified.indexId,
						verified.organizationId,
						"upsert",
						documents as Prisma.InputJsonValue[],
					);
				} else {
					await enqueueManySearchIngest(
						verified.indexId,
						verified.organizationId,
						"delete",
						externalIds.map((id) => ({ external_id: id })) as Prisma.InputJsonValue[],
					);
				}

				const durationMs = Date.now() - startTime;
				const itemsProcessed = action === "upsert" ? documents.length : externalIds.length;

				// Record delivery log for connector dashboard
				void recordSearchUsage({
					indexId: verified.indexId,
					organizationId: verified.organizationId,
					type: "webhook_delivery" as const,
					count: 1,
					metadata: {
						source: "webhook",
						action,
						itemsProcessed,
						indexSlug: verified.indexSlug,
						durationMs,
						signatureVerified: webhookSecret?.enabled ? true : false,
						userAgent: c.req.header("user-agent") ?? null,
					},
				}).catch((err: Error) =>
					logger.warn("webhook delivery log failed", { err: String(err) }),
				);

				return c.json({
					status: "accepted",
					action,
					itemsProcessed,
				});
			} catch (error) {
				logger.error("Webhook sync enqueue failed", {
					error: String(error),
					indexSlug: verified.indexSlug,
					action,
				});
				return c.json({ error: "sync_failed" }, 502);
			}
		} catch (error) {
			logger.error("Webhook handler error", { error: String(error) });
			return c.json({ error: "internal_error" }, 500);
		}
	});
