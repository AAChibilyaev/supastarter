/**
 * V1 Documents endpoints.
 *
 *   PUT    /v1/indexes/:indexId/documents/:documentId   — upsert single document
 *   POST   /v1/indexes/:indexId/documents:batch          — batch upsert documents
 *   DELETE /v1/indexes/:indexId/documents/:documentId    — delete document
 */

import {
	enqueueManySearchIngest,
	enqueueSearchIngest,
	recordSearchUsage,
	type Prisma,
} from "@repo/database";
import { logger } from "@repo/logs";
import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";

export const documentsApp = new Hono()
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
				type: "ingest_enqueued",
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
				type: "ingest_enqueued",
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
	});
