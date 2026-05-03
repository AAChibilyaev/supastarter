/**
 * V1 Global Synonym Sets endpoints.
 *
 * Manages global synonym sets that apply to all indexes in a project.
 *
 *   GET    /v1/synonym-sets              — list global synsets
 *   POST   /v1/synonym-sets              — create a global synset
 *   PUT    /v1/synonym-sets              — replace all global synsets
 *   DELETE /v1/synonym-sets/:synsetId    — delete a global synset
 *   GET    /v1/indexes/:indexId/effective-synonyms — get synsets that apply to this index
 */

import { getSearchIndexById } from "@repo/database";
import {
	getEffectiveGlobalSynonymSets,
	getGlobalSynonymSets,
	globalSynonymSetsToPairs,
	deleteGlobalSynonymSet,
	replaceGlobalSynonymSets,
} from "@repo/database/prisma/queries/global-synonym-sets";
import { logger } from "@repo/logs";
import { aliasName, syncSynonymsToTypesense, typesenseFetch } from "@repo/search";
import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";

const GLOBAL_PREFIX = "gsyn_";

function sanitizeId(id: string): string {
	return id.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

// ── Helpers ──────────────────────────────────────────────────────────

async function syncGlobalToTypesense(
	organizationId: string,
	sets: { root: string; synonyms: string[]; locale?: string | null }[],
) {
	const prefix = `${GLOBAL_PREFIX}${sanitizeId(organizationId)}_`;
	const existing = await typesenseFetch<{ synonym_sets: { id: string }[] }>(
		"GET",
		"/synonym_sets",
	).catch(() => ({ synonym_sets: [] }));
	const existingIds = new Set(
		(existing.synonym_sets ?? []).filter((s) => s.id.startsWith(prefix)).map((s) => s.id),
	);
	const newIds = new Set<string>();

	for (const entry of sets) {
		const id = `${prefix}${sanitizeId(entry.root)}`;
		newIds.add(id);
		try {
			await typesenseFetch("PUT", `/synonym_sets/${encodeURIComponent(id)}`, {
				root: entry.root,
				synonyms: entry.synonyms,
				locale: entry.locale ?? "en",
			});
		} catch (err) {
			logger.error("V1 global-synonym-sets: Typesense upsert failed", { id, err });
		}
	}

	for (const id of existingIds) {
		if (!newIds.has(id)) {
			await typesenseFetch("DELETE", `/synonym_sets/${encodeURIComponent(id)}`).catch(
				() => undefined,
			);
		}
	}
}

// ── Zod schemas ──────────────────────────────────────────────────────

const globalSynsetInputSchema = z.object({
	name: z.string().min(1).max(255),
	root: z.string().min(1).max(255),
	synonyms: z.array(z.string().min(1).max(255)).min(1).max(100),
	locale: z.string().max(10).optional(),
	scope: z.enum(["all", "selected"]).default("all"),
	excludedCollectionIds: z.array(z.string()).default([]),
});

// ── Router ───────────────────────────────────────────────────────────

export const globalSynonymSetsApp = new Hono()

	// List all global synonym sets
	.get("/synonym-sets", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		try {
			const sets = await getGlobalSynonymSets(verified.organizationId);
			return c.json({
				synonym_sets: sets.map((s) => ({
					id: s.id,
					name: s.name,
					root: s.root,
					synonyms: s.synonyms,
					locale: s.locale,
					scope: s.scope,
					excluded_collection_ids: s.excludedCollectionIds,
					created_at: s.createdAt.toISOString(),
					updated_at: s.updatedAt.toISOString(),
				})),
			});
		} catch (error) {
			logger.error("V1 list global synonym sets failed", {
				error,
				organizationId: verified.organizationId,
			});
			return c.json(
				{ error: "internal_error", message: "Failed to retrieve global synonym sets" },
				502,
			);
		}
	})

	// Create a single global synonym set
	.post("/synonym-sets", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json(
				{ error: "invalid_json", message: "Request body must be valid JSON" },
				400,
			);
		}

		const parsed = globalSynsetInputSchema.safeParse(body);
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

		try {
			const saved = await replaceGlobalSynonymSets(verified.organizationId, [parsed.data]);
			const set = saved[0];

			// Sync to Typesense
			await syncGlobalToTypesense(verified.organizationId, [
				{
					root: parsed.data.root,
					synonyms: parsed.data.synonyms,
					locale: parsed.data.locale,
				},
			]);

			logger.info("Global synonym set created", {
				organizationId: verified.organizationId,
				id: set.id,
				root: set.root,
			});

			return c.json(
				{
					id: set.id,
					name: set.name,
					root: set.root,
					synonyms: set.synonyms,
					locale: set.locale,
					scope: set.scope,
					excluded_collection_ids: set.excludedCollectionIds,
					created_at: set.createdAt.toISOString(),
					updated_at: set.updatedAt.toISOString(),
				},
				201,
			);
		} catch (error) {
			logger.error("V1 create global synonym set failed", {
				error,
				organizationId: verified.organizationId,
			});
			return c.json(
				{ error: "internal_error", message: "Failed to create global synonym set" },
				502,
			);
		}
	})

	// Replace all global synonym sets (bulk)
	.put("/synonym-sets", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const schema = z.object({
			synonym_sets: z.array(globalSynsetInputSchema),
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

		try {
			const saved = await replaceGlobalSynonymSets(
				verified.organizationId,
				parsed.data.synonym_sets.map((s) => ({
					name: s.name,
					root: s.root,
					synonyms: s.synonyms,
					locale: s.locale,
					scope: s.scope,
					excludedCollectionIds: s.excludedCollectionIds,
				})),
			);

			// Sync all to Typesense
			await syncGlobalToTypesense(
				verified.organizationId,
				parsed.data.synonym_sets.map((s) => ({
					root: s.root,
					synonyms: s.synonyms,
					locale: s.locale,
				})),
			);

			logger.info("Global synonym sets replaced", {
				organizationId: verified.organizationId,
				count: saved.length,
			});

			return c.json({
				synonym_sets: saved.map((s) => ({
					id: s.id,
					name: s.name,
					root: s.root,
					synonyms: s.synonyms,
					locale: s.locale,
					scope: s.scope,
					excluded_collection_ids: s.excludedCollectionIds,
					created_at: s.createdAt.toISOString(),
					updated_at: s.updatedAt.toISOString(),
				})),
			});
		} catch (error) {
			logger.error("V1 replace global synonym sets failed", {
				error,
				organizationId: verified.organizationId,
			});
			return c.json(
				{ error: "internal_error", message: "Failed to replace global synonym sets" },
				502,
			);
		}
	})

	// Delete a single global synonym set
	.delete("/synonym-sets/:synsetId", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const synsetId = c.req.param("synsetId");
		if (!synsetId) {
			return c.json({ error: "invalid_input", message: "synsetId is required" }, 400);
		}

		try {
			const deleted = await deleteGlobalSynonymSet(synsetId, verified.organizationId);
			if (!deleted) {
				return c.json({ error: "not_found", message: "Global synonym set not found" }, 404);
			}

			// Clean up Typesense
			const prefix = `${GLOBAL_PREFIX}${sanitizeId(verified.organizationId)}_`;
			const escapedRoot = sanitizeId(synsetId);
			const typesenseId = `${prefix}${escapedRoot}`;
			await typesenseFetch(
				"DELETE",
				`/synonym_sets/${encodeURIComponent(typesenseId)}`,
			).catch(() => undefined);

			logger.info("Global synonym set deleted", {
				organizationId: verified.organizationId,
				id: synsetId,
			});

			return c.json({ success: true }, 200);
		} catch (error) {
			logger.error("V1 delete global synonym set failed", {
				error,
				organizationId: verified.organizationId,
				id: synsetId,
			});
			return c.json(
				{ error: "internal_error", message: "Failed to delete global synonym set" },
				502,
			);
		}
	})

	// Get effective global synonyms for an index
	.get("/indexes/:indexId/effective-synonyms", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await getSearchIndexById(indexId);
		if (!index || index.organizationId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		try {
			const sets = await getEffectiveGlobalSynonymSets(verified.organizationId, index.id);
			return c.json({
				synonym_sets: sets.map((s) => ({
					id: s.id,
					root: s.root,
					synonyms: s.synonyms,
					locale: s.locale,
				})),
			});
		} catch (error) {
			logger.error("V1 get effective synonyms failed", { error, indexId });
			return c.json(
				{ error: "internal_error", message: "Failed to retrieve effective synonyms" },
				502,
			);
		}
	});
