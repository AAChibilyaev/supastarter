/**
 * V1 Indexes endpoints.
 *
 *   POST /v1/projects/:projectId/indexes   — create index
 *   GET  /v1/indexes/:indexId              — get single index
 */

import {
	createSearchIndex,
	db,
	deleteSearchIndex,
	getSearchIndexById,
	getSearchIndexBySlug,
	listSearchIndexes,
	updateSearchIndex,
} from "@repo/database";
import { logger } from "@repo/logs";
import {
	createPhysicalCollection,
	deleteSearchIndexCollections,
	ensureAlias,
	getTypesenseClient,
	physicalCollectionName,
} from "@repo/search";
import { Hono } from "hono";
import { z } from "zod";

import { searchFieldSchema, searchIndexSlugSchema } from "../modules/search/types";
import { requireScope } from "./auth";

export const indexesApp = new Hono()
	// ── Create index ───────────────────────────────────────────────
	.post("/projects/:projectId/indexes", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const projectId = c.req.param("projectId");
		if (projectId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Project not found" }, 404);
		}

		const schema = z.object({
			slug: searchIndexSlugSchema,
			displayName: z.string().min(1).max(120),
			fields: z.array(searchFieldSchema).min(1),
			defaultSortingField: z.string().optional(),
		});

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json", message: "Request body must be valid JSON" }, 400);
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

		const existing = await getSearchIndexBySlug(verified.organizationId, parsed.data.slug);
		if (existing) {
			return c.json(
				{ error: "conflict", message: "Index slug already exists in this project" },
				409,
			);
		}

		const created = await createSearchIndex({
			organizationId: verified.organizationId,
			slug: parsed.data.slug,
			displayName: parsed.data.displayName,
			schema: {
				fields: parsed.data.fields,
				defaultSortingField: parsed.data.defaultSortingField,
			},
		});

		try {
			await createPhysicalCollection({
				organizationId: verified.organizationId,
				slug: parsed.data.slug,
				version: created.version,
				fields: parsed.data.fields,
				defaultSortingField: parsed.data.defaultSortingField,
			});
			await ensureAlias(verified.organizationId, parsed.data.slug, created.version);
		} catch (error) {
			logger.error("Failed to create Typesense collection", { error });
			return c.json(
				{ error: "internal_error", message: "Could not create search collection" },
				502,
			);
		}

		return c.json(
			{
				id: created.id,
				slug: created.slug,
				displayName: created.displayName,
				version: created.version,
				organizationId: created.organizationId,
				enabled: created.enabled,
				createdAt: created.createdAt,
				updatedAt: created.updatedAt,
			},
			201,
		);
	})

	// ── List indexes in a project ──────────────────────────────────
	.get("/projects/:projectId/indexes", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const projectId = c.req.param("projectId");
		if (projectId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Project not found" }, 404);
		}

		const indexes = await listSearchIndexes(verified.organizationId);

		return c.json(
			indexes.map((idx) => ({
				id: idx.id,
				slug: idx.slug,
				displayName: idx.displayName,
				version: idx.version,
				enabled: idx.enabled,
				apiKeysCount: idx._count.apiKeys,
				createdAt: idx.createdAt,
				updatedAt: idx.updatedAt,
			})),
		);
	})

	// ── Get index by ID ────────────────────────────────────────────
	.get("/indexes/:indexId", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await getSearchIndexById(indexId);

		if (!index || index.organizationId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		return c.json({
			id: index.id,
			organizationId: index.organizationId,
			slug: index.slug,
			displayName: index.displayName,
			version: index.version,
			enabled: index.enabled,
			schema: index.schema,
			createdAt: index.createdAt,
			updatedAt: index.updatedAt,
		});
	})

	// ── Update index (PATCH) ───────────────────────────────────────
	.patch("/indexes/:indexId", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await getSearchIndexById(indexId);

		if (!index || index.organizationId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		const schema = z.object({
			displayName: z.string().min(1).max(120).optional(),
			enabled: z.boolean().optional(),
		});

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json", message: "Request body must be valid JSON" }, 400);
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

		if (parsed.data.displayName === undefined && parsed.data.enabled === undefined) {
			return c.json(
				{ error: "invalid_input", message: "At least one field must be provided" },
				400,
			);
		}

		const updated = await updateSearchIndex(indexId, parsed.data);

		return c.json({
			id: updated.id,
			organizationId: updated.organizationId,
			slug: updated.slug,
			displayName: updated.displayName,
			version: updated.version,
			enabled: updated.enabled,
			schema: updated.schema,
			createdAt: updated.createdAt,
			updatedAt: updated.updatedAt,
		});
	})

	// ── Delete index ───────────────────────────────────────────────
	.delete("/indexes/:indexId", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await getSearchIndexById(indexId);

		if (!index || index.organizationId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		try {
			await deleteSearchIndexCollections(index.organizationId, index.slug);
			await deleteSearchIndex(indexId);
		} catch (error) {
			logger.error("Failed to delete search index", {
				error,
				indexId,
				organizationId: index.organizationId,
				slug: index.slug,
			});
			return c.json({ error: "internal_error", message: "Could not delete search index" }, 502);
		}

		return c.json({ deleted: true, id: index.id, slug: index.slug });
	})

	// ── Get index stats ────────────────────────────────────────────
	.get("/indexes/:indexId/stats", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await getSearchIndexById(indexId);

		if (!index || index.organizationId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		// Live document count from Typesense (best-effort — 0 if unavailable)
		let documentCount = 0;
		try {
			const client = getTypesenseClient();
			const collName = physicalCollectionName(index.organizationId, index.slug, index.version);
			const collection = await client.collections(collName).retrieve();
			documentCount = collection.num_documents;
		} catch (error) {
			logger.warn("Could not retrieve Typesense collection stats", { indexId, error });
		}

		// Usage aggregation for last 30 days
		const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const usageRows = await db.searchUsageEvent.groupBy({
			by: ["type"],
			where: { indexId, createdAt: { gte: since } },
			_sum: { count: true },
		});
		const sumByType = Object.fromEntries(usageRows.map((r) => [r.type, r._sum.count ?? 0]));

		// Ingest queue + active key counts (parallel)
		const [pendingCount, failedCount, activeKeysCount] = await Promise.all([
			db.searchIngestBuffer.count({
				where: { indexId, processedAt: null },
			}),
			db.searchIngestBuffer.count({
				where: { indexId, processedAt: null, attempts: { gt: 0 } },
			}),
			db.searchApiKey.count({
				where: { indexId, revokedAt: null },
			}),
		]);

		return c.json({
			id: index.id,
			slug: index.slug,
			displayName: index.displayName,
			version: index.version,
			documentCount,
			usage: {
				since: since.toISOString(),
				totalSearches: sumByType["search_query"] ?? 0,
				totalIndexed: sumByType["documents_indexed"] ?? 0,
				zeroResultCount: sumByType["zero_results"] ?? 0,
				clickCount: sumByType["click"] ?? 0,
			},
			ingestQueue: {
				pending: pendingCount,
				failed: failedCount,
			},
			apiKeysCount: activeKeysCount,
			createdAt: index.createdAt,
			updatedAt: index.updatedAt,
		});
	});
