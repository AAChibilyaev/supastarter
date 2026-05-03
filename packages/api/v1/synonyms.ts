/**
 * V1 Synonyms, Curations, Sorting, and Facets endpoints.
 *
 * Manages Typesense collection features for a given index:
 *
 *   GET    /v1/indexes/:indexId/synonyms              — list all synonyms
 *   POST   /v1/indexes/:indexId/synonyms              — create a single synonym
 *   PUT    /v1/indexes/:indexId/synonyms              — upsert synonyms (bulk replace)
 *   DELETE /v1/indexes/:indexId/synonyms/:synonymId   — delete a single synonym
 *
 *   GET    /v1/indexes/:indexId/curations             — list all curations
 *   POST   /v1/indexes/:indexId/curations             — create a single curation
 *   PUT    /v1/indexes/:indexId/curations             — upsert curations (bulk replace)
 *   DELETE /v1/indexes/:indexId/curations/:curationId — delete a single curation
 *
 *   GET    /v1/indexes/:indexId/sorting               — list sorting fields
 *   POST   /v1/indexes/:indexId/sorting               — add a sorting field
 *   PUT    /v1/indexes/:indexId/sorting               — replace all sorting fields
 *   DELETE /v1/indexes/:indexId/sorting/:fieldName    — remove a sorting field
 *
 *   GET    /v1/indexes/:indexId/facets                — list facet fields
 */

import { getSearchIndexById } from "@repo/database";
import { logger } from "@repo/logs";
import {
	aliasName,
	getCurationSetsForCollection,
	deleteCurationSetById,
	getSynonymSetsForCollection,
	deleteSynonymSetById,
	getTypesenseClient,
	physicalCollectionName,
	syncCurationsToTypesense,
	syncSynonymsToTypesense,
	typesenseFetch,
	type CurationRule,
	type SynonymPair,
} from "@repo/search";
import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";

// ── Types ────────────────────────────────────────────────────────────

interface SchemaField {
	name: string;
	type: string;
	facet?: boolean;
	sort?: boolean;
	optional?: boolean;
	index?: boolean;
	locale?: string;
	infix?: boolean;
	[numDim: string]: unknown;
}

// ── Helpers ──────────────────────────────────────────────────────────

async function resolveIndex(c: any, indexId: string, verified: { organizationId: string }) {
	const index = await getSearchIndexById(indexId);
	if (!index || index.organizationId !== verified.organizationId) {
		return c.json({ error: "not_found", message: "Index not found" }, 404);
	}
	return index;
}

function sanitizeId(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
		.slice(0, 64);
}

async function getCollectionSchema(organizationId: string, slug: string) {
	const client = getTypesenseClient();
	const collName = aliasName(organizationId, slug);
	return client.collections(collName).retrieve();
}

// ── Zod schemas ──────────────────────────────────────────────────────

const synonymInputSchema = z.object({
	root: z.string().min(1).max(256),
	synonyms: z.array(z.string().min(1).max(256)).min(1),
});

const curationInputSchema = z.object({
	query: z.string().min(1).max(256),
	pinnedIds: z.array(z.string()).default([]),
	hiddenIds: z.array(z.string()).default([]),
});

const sortingFieldSchema = z.object({
	name: z.string().min(1).max(64),
});

// ── Router ───────────────────────────────────────────────────────────

export const synonymsApp = new Hono()

	// ── Synonyms ────────────────────────────────────────────────────

	// List all synonyms
	.get("/indexes/:indexId/synonyms", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		const collectionName = aliasName(verified.organizationId, index.slug);

		try {
			const sets = await getSynonymSetsForCollection(collectionName);
			return c.json({ synonym_sets: sets });
		} catch (error) {
			logger.error("V1 list synonyms failed", { error, indexId, collectionName });
			return c.json({ error: "internal_error", message: "Failed to retrieve synonyms" }, 502);
		}
	})

	// Create a single synonym
	.post("/indexes/:indexId/synonyms", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json(
				{ error: "invalid_json", message: "Request body must be valid JSON" },
				400,
			);
		}

		const parsed = synonymInputSchema.safeParse(body);
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

		const collectionName = aliasName(verified.organizationId, index.slug);
		const id = `syn_${sanitizeId(collectionName)}_${sanitizeId(parsed.data.root)}`;

		try {
			await typesenseFetch("PUT", `/synonym_sets/${encodeURIComponent(id)}`, {
				root: parsed.data.root,
				synonyms: parsed.data.synonyms,
			});
			logger.info("Synonym created", { indexId, collectionName, id, root: parsed.data.root });
			return c.json({ id, root: parsed.data.root, synonyms: parsed.data.synonyms }, 201);
		} catch (error) {
			logger.error("V1 create synonym failed", { error, indexId, collectionName, id });
			return c.json({ error: "internal_error", message: "Failed to create synonym" }, 502);
		}
	})

	// Upsert synonyms (bulk replace)
	.put("/indexes/:indexId/synonyms", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		const schema = z.object({
			synonyms: z.array(
				z.object({
					root: z.string().min(1).max(256),
					synonym: z.string().min(1).max(256),
					locale: z.string().min(2).max(5).optional(),
				}),
			),
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

		const collectionName = aliasName(verified.organizationId, index.slug);
		const pairs: SynonymPair[] = parsed.data.synonyms;

		try {
			await syncSynonymsToTypesense(collectionName, pairs);
			logger.info("Synonyms synced to Typesense", {
				indexId,
				collectionName,
				count: pairs.length,
			});
			return c.json({ synced: pairs.length });
		} catch (error) {
			logger.error("V1 synonyms sync failed", { error, indexId, collectionName });
			return c.json({ error: "internal_error", message: "Failed to sync synonyms" }, 502);
		}
	})

	// Delete a single synonym
	.delete("/indexes/:indexId/synonyms/:synonymId", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const synonymId = c.req.param("synonymId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		const collectionName = aliasName(verified.organizationId, index.slug);

		try {
			await deleteSynonymSetById(synonymId);
			logger.info("Synonym deleted", { indexId, collectionName, synonymId });
			return c.json({ id: synonymId, deleted: true });
		} catch (error) {
			logger.error("V1 delete synonym failed", { error, indexId, collectionName, synonymId });
			return c.json({ error: "internal_error", message: "Failed to delete synonym" }, 502);
		}
	})

	// ── Curations ───────────────────────────────────────────────────

	// List all curations
	.get("/indexes/:indexId/curations", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		const collectionName = aliasName(verified.organizationId, index.slug);

		try {
			const sets = await getCurationSetsForCollection(collectionName);
			return c.json({ curation_sets: sets });
		} catch (error) {
			logger.error("V1 list curations failed", { error, indexId, collectionName });
			return c.json(
				{ error: "internal_error", message: "Failed to retrieve curations" },
				502,
			);
		}
	})

	// Create a single curation
	.post("/indexes/:indexId/curations", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json(
				{ error: "invalid_json", message: "Request body must be valid JSON" },
				400,
			);
		}

		const parsed = curationInputSchema.safeParse(body);
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

		const collectionName = aliasName(verified.organizationId, index.slug);
		const sanitized = sanitizeId(parsed.data.query);
		const id = sanitized.length > 0 ? `cur_${sanitized}` : `cur_${Date.now()}`;

		const includes = parsed.data.pinnedIds.map((docId, pos) => ({
			id: docId,
			position: pos + 1,
		}));
		const excludes = parsed.data.hiddenIds.map((docId) => ({ id: docId }));

		try {
			const body: Record<string, unknown> = {
				collection_name: collectionName,
				rule: { query: parsed.data.query, match: "exact" },
				...(includes.length > 0 ? { includes } : {}),
				...(excludes.length > 0 ? { excludes } : {}),
			};
			await typesenseFetch("PUT", `/curation_sets/${encodeURIComponent(id)}`, body);
			logger.info("Curation created", { indexId, collectionName, id });
			return c.json(
				{
					id,
					query: parsed.data.query,
					pinnedIds: parsed.data.pinnedIds,
					hiddenIds: parsed.data.hiddenIds,
				},
				201,
			);
		} catch (error) {
			logger.error("V1 create curation failed", { error, indexId, collectionName, id });
			return c.json({ error: "internal_error", message: "Failed to create curation" }, 502);
		}
	})

	// Upsert curations (bulk replace)
	.put("/indexes/:indexId/curations", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		const schema = z.object({
			curations: z.array(
				z.object({
					query: z.string().min(1).max(256),
					pinnedIds: z.array(z.string()).default([]),
					hiddenIds: z.array(z.string()).default([]),
				}),
			),
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

		const collectionName = aliasName(verified.organizationId, index.slug);
		const rules: CurationRule[] = parsed.data.curations;

		try {
			await syncCurationsToTypesense(collectionName, rules);
			logger.info("Curations synced to Typesense", {
				indexId,
				collectionName,
				count: rules.length,
			});
			return c.json({ synced: rules.length });
		} catch (error) {
			logger.error("V1 curations sync failed", { error, indexId, collectionName });
			return c.json({ error: "internal_error", message: "Failed to sync curations" }, 502);
		}
	})

	// Delete a single curation
	.delete("/indexes/:indexId/curations/:curationId", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const curationId = c.req.param("curationId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		const collectionName = aliasName(verified.organizationId, index.slug);

		try {
			await deleteCurationSetById(curationId);
			logger.info("Curation deleted", { indexId, collectionName, curationId });
			return c.json({ id: curationId, deleted: true });
		} catch (error) {
			logger.error("V1 delete curation failed", {
				error,
				indexId,
				collectionName,
				curationId,
			});
			return c.json({ error: "internal_error", message: "Failed to delete curation" }, 502);
		}
	})

	// ── Sorting ─────────────────────────────────────────────────────

	// List sorting fields (fields with sort: true)
	.get("/indexes/:indexId/sorting", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		try {
			const schema = await getCollectionSchema(verified.organizationId, index.slug);
			const sortingFields = schema.fields
				.filter((f: SchemaField) => f.sort === true)
				.map((f: SchemaField) => ({ name: f.name, type: f.type }));
			return c.json({ fields: sortingFields });
		} catch (error) {
			logger.error("V1 list sorting fields failed", { error, indexId });
			return c.json(
				{ error: "internal_error", message: "Failed to retrieve sorting fields" },
				502,
			);
		}
	})

	// Add a sorting field
	.post("/indexes/:indexId/sorting", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json(
				{ error: "invalid_json", message: "Request body must be valid JSON" },
				400,
			);
		}

		const parsed = sortingFieldSchema.safeParse(body);
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

		const collName = physicalCollectionName(verified.organizationId, index.slug, index.version);
		const client = getTypesenseClient();

		try {
			const collection = client.collections(collName);
			const currentSchema = await collection.retrieve();
			const existingField = currentSchema.fields.find(
				(f: SchemaField) => f.name === parsed.data.name,
			);

			if (!existingField) {
				return c.json(
					{
						error: "not_found",
						message: `Field "${parsed.data.name}" not found in index schema`,
					},
					404,
				);
			}

			await collection.update({
				fields: [{ name: parsed.data.name, type: existingField.type, sort: true }],
			});

			logger.info("Sorting field added", { indexId, fieldName: parsed.data.name });
			return c.json({ name: parsed.data.name, type: existingField.type, sort: true }, 201);
		} catch (error) {
			logger.error("V1 add sorting field failed", {
				error,
				indexId,
				fieldName: parsed.data.name,
			});
			return c.json({ error: "internal_error", message: "Failed to add sorting field" }, 502);
		}
	})

	// Replace all sorting fields
	.put("/indexes/:indexId/sorting", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		const schema = z.object({
			fields: z.array(z.object({ name: z.string().min(1).max(64) })).min(1),
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

		const collName = physicalCollectionName(verified.organizationId, index.slug, index.version);
		const client = getTypesenseClient();

		try {
			const collection = client.collections(collName);
			const currentSchema = await collection.retrieve();

			// Build update: set sort=false on all existing sortable fields, then sort=true on requested ones
			const fieldUpdates: any[] = [];

			for (const existing of currentSchema.fields as SchemaField[]) {
				const requested = parsed.data.fields.find((f) => f.name === existing.name);
				if (requested) {
					// Enable sort on requested field, keep its type
					fieldUpdates.push({ name: existing.name, type: existing.type, sort: true });
				} else if (existing.sort === true) {
					// Disable sort on fields no longer requested
					fieldUpdates.push({ name: existing.name, type: existing.type, sort: false });
				}
			}

			if (fieldUpdates.length === 0) {
				return c.json({ error: "invalid_input", message: "No fields to update" }, 400);
			}

			await collection.update({ fields: fieldUpdates });

			logger.info("Sorting fields replaced", { indexId, count: parsed.data.fields.length });
			return c.json({
				fields: parsed.data.fields.map((f) => f.name),
				updated: fieldUpdates.length,
			});
		} catch (error) {
			logger.error("V1 replace sorting fields failed", { error, indexId });
			return c.json(
				{ error: "internal_error", message: "Failed to replace sorting fields" },
				502,
			);
		}
	})

	// Remove a sorting field
	.delete("/indexes/:indexId/sorting/:fieldName", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const fieldName = c.req.param("fieldName");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		const collName = physicalCollectionName(verified.organizationId, index.slug, index.version);
		const client = getTypesenseClient();

		try {
			const collection = client.collections(collName);
			const currentSchema = await collection.retrieve();
			const existingField = currentSchema.fields.find(
				(f: SchemaField) => f.name === fieldName,
			);

			if (!existingField) {
				return c.json(
					{
						error: "not_found",
						message: `Field "${fieldName}" not found in index schema`,
					},
					404,
				);
			}

			await collection.update({
				fields: [{ name: fieldName, type: existingField.type, sort: false }],
			});

			logger.info("Sorting field removed", { indexId, fieldName });
			return c.json({ name: fieldName, sort: false, removed: true });
		} catch (error) {
			logger.error("V1 remove sorting field failed", { error, indexId, fieldName });
			return c.json(
				{ error: "internal_error", message: "Failed to remove sorting field" },
				502,
			);
		}
	})

	// ── Facets ──────────────────────────────────────────────────────

	// List facet fields (fields with facet: true)
	.get("/indexes/:indexId/facets", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const index = await resolveIndex(c, indexId, verified);
		if (index instanceof Response) return index;

		try {
			const schema = await getCollectionSchema(verified.organizationId, index.slug);
			const facetFields = schema.fields
				.filter((f: SchemaField) => f.facet === true)
				.map((f: SchemaField) => ({
					name: f.name,
					type: f.type,
					sort: f.sort ?? false,
				}));
			return c.json({ fields: facetFields });
		} catch (error) {
			logger.error("V1 list facets failed", { error, indexId });
			return c.json({ error: "internal_error", message: "Failed to retrieve facets" }, 502);
		}
	});
