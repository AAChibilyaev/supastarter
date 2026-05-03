/**
 * V1 Sync Jobs endpoints.
 *
 *   GET /v1/projects/:projectId/sync-jobs  — list sync jobs for a project
 */

import { db } from "@repo/database";
import { Hono } from "hono";

import { requireScope } from "./auth";

export const syncJobsApp = new Hono().get("/projects/:projectId/sync-jobs", async (c) => {
	const gated = await requireScope("admin")(c);
	if (gated instanceof Response) return gated;
	const { verified } = gated;

	const projectId = c.req.param("projectId");
	if (projectId !== verified.organizationId) {
		return c.json({ error: "not_found", message: "Project not found" }, 404);
	}

	const jobs = await db.searchConnectorSyncJob.findMany({
		where: { organizationId: verified.organizationId },
		orderBy: { createdAt: "desc" },
		take: 100,
		select: {
			id: true,
			indexId: true,
			type: true,
			status: true,
			startedAt: true,
			finishedAt: true,
			itemsCount: true,
			failuresCount: true,
			lastError: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return c.json(
		jobs.map((j) => ({
			id: j.id,
			indexId: j.indexId,
			type: j.type,
			status: j.status,
			startedAt: j.startedAt.toISOString(),
			finishedAt: j.finishedAt?.toISOString() ?? null,
			itemsCount: j.itemsCount,
			failuresCount: j.failuresCount,
			lastError: j.lastError,
			createdAt: j.createdAt.toISOString(),
			updatedAt: j.updatedAt.toISOString(),
		})),
	);
});
