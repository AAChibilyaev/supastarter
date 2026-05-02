/**
 * V1 Documents endpoints.
 *
 *   GET    /v1/indexes/:indexId/documents                — list / browse documents
 *   PUT    /v1/indexes/:indexId/documents/:documentId    — upsert single document
 *   POST   /v1/indexes/:indexId/documents:batch           — batch upsert documents
 *   POST   /v1/indexes/:indexId/documents:batchDelete     — batch delete documents by IDs
 *   DELETE /v1/indexes/:indexId/documents/:documentId     — delete document
 */

import {
	enqueueManySearchIngest,
	enqueueSearchIngest,
	getSearchIndexById,
	recordSearchUsage,
	type Prisma,
} from "@repo/database";
import { logger } from "@repo/logs";
import {
	aliasName,
	exportDocumentsRaw,
	physicalCollectionName,
	searchDocuments,
} from "@repo/search";
import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";

export const documentsApp = new Hono()
	// ── List / browse documents ────────────────────────────────────
	.get("/indexes/:indexId/documents", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		if (indexId !== verified.indexId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		const querySchema = z.object({
			q: z.string().optional().default("*"),
			page: z.coerce.number().int().min(1).optional().default(1),
			perPage: z.coerce.number().int().min(1).max(250).optional().default(20),
			filterBy: z.string().optional(),
		});

		const parsed = querySchema.safeParse({
			q: c.req.query("q"),
			page: c.req.query("page"),
			perPage: c.req.query("perPage"),
			filterBy: c.req.query("filterBy"),
		});

		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
		}

		try {
			const result = await searchDocuments({
				alias: aliasName(verified.organizationId, verified.indexSlug),
				tenantId: verified.organizationId,
				q: parsed.data.q,
				filterBy: parsed.data.filterBy,
				perPage: parsed.data.perPage,
				page: parsed.data.page,
			});

			void recordSearchUsage({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				type: "search_query",
			}).catch((error) => logger.error("Could not record search usage", { error }));

			return c.json({
				hits: result.hits,
				found: result.found,
				page: result.page,
				perPage: result.perPage,
			});
		} catch (error) {
			logger.error("V1 list documents failed", { error, indexId });
			return c.json({ error: "search_failed", message: "Failed to retrieve documents" }, 502);
		}
	})

	// ── Upsert single document ─────────────────────────────────────
	.put("/indexes/:indexId/documents/:documentId", async (c) => {
		const gated = await requireScope("ingest")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const documentId = c.req.param("documentId");

		if (indexId !== verified.indexId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json(
				{ error: "invalid_json", message: "Request body must be valid JSON" },
				400,
			);
		}

		const schema = z.record(z.string(), z.unknown());
		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "invalid_input",
					message: "Document must be a JSON object",
					details: parsed.error.issues,
				},
				400,
			);
		}

		try {
			const docWithId = { ...parsed.data, id: documentId };
			await enqueueSearchIngest({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				action: "upsert",
				document: docWithId as Prisma.InputJsonValue,
			});

			await recordSearchUsage({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				type: "ingest_write",
				count: 1,
			});

			return c.json({ id: documentId, queued: true });
		} catch (error) {
			logger.error("Document upsert enqueue failed", { error, indexId, documentId });
			return c.json({ error: "internal_error", message: "Failed to enqueue document" }, 502);
		}
	})

	// ── Batch upsert documents ─────────────────────────────────────
	.post("/indexes/:indexId/documents:batch", async (c) => {
		const gated = await requireScope("ingest")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		if (indexId !== verified.indexId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		const schema = z.object({
			documents: z.array(z.record(z.string(), z.unknown())).min(1).max(5000),
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
			const queued = await enqueueManySearchIngest(
				verified.indexId,
				verified.organizationId,
				"upsert",
				parsed.data.documents as Prisma.InputJsonValue[],
			);

			await recordSearchUsage({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				type: "ingest_write",
				count: queued,
			});

			return c.json({
				queued,
				accepted: parsed.data.documents.length,
			});
		} catch (error) {
			logger.error("Batch upsert enqueue failed", { error, indexId });
			return c.json({ error: "internal_error", message: "Failed to enqueue documents" }, 502);
		}
	})

	// ── Batch delete documents ────────────────────────────────────
	.post("/indexes/:indexId/documents:batchDelete", async (c) => {
		const gated = await requireScope("ingest")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		if (indexId !== verified.indexId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		const schema = z.object({
			ids: z.array(z.string().min(1)).min(1).max(5000),
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
			const documents = parsed.data.ids.map((id) => ({ id }) as Prisma.InputJsonValue);
			const queued = await enqueueManySearchIngest(
				verified.indexId,
				verified.organizationId,
				"delete",
				documents,
			);

			return c.json({ queued, accepted: parsed.data.ids.length });
		} catch (error) {
			logger.error("Batch delete enqueue failed", { error, indexId });
			return c.json({ error: "internal_error", message: "Failed to enqueue deletions" }, 502);
		}
	})

	// ── Delete document ────────────────────────────────────────────
	.delete("/indexes/:indexId/documents/:documentId", async (c) => {
		const gated = await requireScope("ingest")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		const documentId = c.req.param("documentId");

		if (indexId !== verified.indexId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		try {
			await enqueueSearchIngest({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				action: "delete",
				document: { id: documentId } as Prisma.InputJsonValue,
			});

			return c.json({ id: documentId, deleted: true });
		} catch (error) {
			logger.error("Document delete enqueue failed", { error, indexId, documentId });
			return c.json({ error: "internal_error", message: "Failed to delete document" }, 502);
		}
	})

	// ── Export documents ───────────────────────────────────────────
	.get("/indexes/:indexId/documents/export", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		if (indexId !== verified.indexId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		const querySchema = z.object({
			filterBy: z.string().optional(),
			format: z.enum(["json", "jsonl"]).optional().default("jsonl"),
		});

		const parsed = querySchema.safeParse({
			filterBy: c.req.query("filterBy"),
			format: c.req.query("format"),
		});

		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
		}

		// Lookup index to get version for physical collection name
		const index = await getSearchIndexById(indexId);
		if (!index || index.organizationId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		const collName = physicalCollectionName(
			verified.organizationId,
			verified.indexSlug,
			index.version,
		);

		try {
			const raw = await exportDocumentsRaw({
				collection: collName,
				filterBy: parsed.data.filterBy,
			});

			if (parsed.data.format === "json") {
				const lines = raw.split("\n").filter((line) => line.trim().length > 0);
				const docs = lines
					.map((line) => {
						try {
							return JSON.parse(line);
						} catch {
							return null;
						}
					})
					.filter(Boolean);
				c.header("Content-Type", "application/json");
				return c.json({ documents: docs, total: docs.length });
			}

			// JSONL format (default) — stream as file download
			c.header("Content-Type", "application/x-ndjson");
			c.header("Content-Disposition", `attachment; filename="documents-${indexId}.jsonl"`);
			return c.body(raw, 200);
		} catch (error) {
			logger.error("V1 export documents failed", { error, indexId });
			return c.json({ error: "internal_error", message: "Failed to export documents" }, 502);
		}
	});
