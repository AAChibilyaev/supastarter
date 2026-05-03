/**
 * V1 API Keys endpoints.
 *
 *   POST   /v1/projects/:projectId/keys     — create API key
 *   GET    /v1/projects/:projectId/keys     — list API keys in a project
 *   DELETE /v1/keys/:keyId                  — revoke API key
 */

import {
	createSearchApiKey,
	getSearchApiKeyById,
	listSearchApiKeys,
	revokeSearchApiKey,
} from "@repo/database";
import { db } from "@repo/database";
import { generateSearchApiKey } from "@repo/search";
import { Hono } from "hono";
import { z } from "zod";

import { searchApiKeyScopeSchema } from "../modules/search/types";
import { requireScope } from "./auth";

export const keysApp = new Hono()
	// ── Create API key ─────────────────────────────────────────────
	.post("/projects/:projectId/keys", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const projectId = c.req.param("projectId");
		if (projectId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Project not found" }, 404);
		}

		const schema = z.object({
			indexSlug: z.string().min(1).max(64),
			name: z.string().min(1).max(120),
			scopes: z.array(searchApiKeyScopeSchema).min(1),
			allowedOrigins: z.array(z.string().min(3).max(255)).max(20).optional(),
			rateLimitPerMinute: z.number().int().min(1).max(60_000).optional(),
			expiresAt: z.string().datetime().optional(),
			autodelete: z.boolean().optional(),
			collectionPattern: z.string().max(500).optional(),
			cacheTtl: z.number().int().min(1).max(86_400).optional(),
		});

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json(
				{ error: "invalid_json", message: "Request body must be valid JSON" },
				400,
			);
		}

		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "invalid_input",
					message: "Validation failed",
					details: parsed.error.issues,
				},
				400,
			);
		}

		// Verify the index exists in this project
		const index = await db.searchIndex.findUnique({
			where: {
				organizationId_slug: {
					organizationId: verified.organizationId,
					slug: parsed.data.indexSlug,
				},
			},
		});

		if (!index) {
			return c.json({ error: "not_found", message: "Index not found in this project" }, 404);
		}

		const generated = generateSearchApiKey();
		const created = await createSearchApiKey({
			indexId: index.id,
			organizationId: index.organizationId,
			name: parsed.data.name,
			prefix: generated.prefix,
			hash: generated.hash,
			scopes: parsed.data.scopes,
			allowedOrigins: parsed.data.allowedOrigins,
			rateLimitPerMinute: parsed.data.rateLimitPerMinute,
			expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
		});

		return c.json(
			{
				id: created.id,
				name: created.name,
				prefix: created.prefix,
				scopes: created.scopes,
				allowedOrigins: created.allowedOrigins,
				rateLimitPerMinute: created.rateLimitPerMinute,
				expiresAt: created.expiresAt,
				createdAt: created.createdAt,
				rawKey: generated.rawKey,
			},
			201,
		);
	})

	// ── List API keys in a project ─────────────────────────────────
	.get("/projects/:projectId/keys", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const projectId = c.req.param("projectId");
		if (projectId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Project not found" }, 404);
		}

		// Get all indexes for this project, then all keys
		const indexes = await db.searchIndex.findMany({
			where: { organizationId: verified.organizationId },
			select: { id: true, slug: true, displayName: true },
		});

		const allKeys: Array<Record<string, unknown>> = [];
		for (const idx of indexes) {
			const keys = await listSearchApiKeys(idx.id);
			for (const k of keys) {
				allKeys.push({
					id: k.id,
					name: k.name,
					prefix: k.prefix,
					scopes: k.scopes,
					allowedOrigins: k.allowedOrigins,
					rateLimitPerMinute: k.rateLimitPerMinute,
					expiresAt: k.expiresAt,
					revokedAt: k.revokedAt,
					lastUsedAt: k.lastUsedAt,
					createdAt: k.createdAt,
					indexSlug: idx.slug,
					indexDisplayName: idx.displayName,
				});
			}
		}

		return c.json(allKeys);
	})

	// ── Revoke API key ─────────────────────────────────────────────
	.delete("/keys/:keyId", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const keyId = c.req.param("keyId");
		const key = await getSearchApiKeyById(keyId);

		if (!key || key.organizationId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "API key not found" }, 404);
		}

		await revokeSearchApiKey(keyId);

		return c.json({ id: keyId, revoked: true });
	});
