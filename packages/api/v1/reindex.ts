/**
 * V1 Reindex endpoints.
 *
 *   POST /v1/indexes/:indexId/reindex  — trigger a full reindex job
 */

import { createPendingReindexJob, db } from "@repo/database";
import { Hono } from "hono";

import { requireScope } from "./auth";

export const reindexApp = new Hono().post("/indexes/:indexId/reindex", async (c) => {
	const gated = await requireScope("admin")(c);
	if (gated instanceof Response) return gated;
	const { verified } = gated;

	const indexId = c.req.param("indexId");

	// Verify the index belongs to this org
	const index = await db.searchIndex.findUnique({
		where: { id: indexId },
		select: { organizationId: true, schema: true },
	});

	if (!index || index.organizationId !== verified.organizationId) {
		return c.json({ error: "not_found", message: "Index not found" }, 404);
	}

	// Create the pending reindex job
	const fields = (index.schema as { fields?: unknown[] })?.fields ?? [];
	const job = await createPendingReindexJob({
		indexId,
		organizationId: verified.organizationId,
		fields,
	});

	return c.json({
		jobId: job.id,
		status: "pending",
	});
});
