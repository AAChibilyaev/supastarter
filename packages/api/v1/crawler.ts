/**
 * V1 Crawler endpoints.
 *
 *   POST /v1/projects/:projectId/crawl  — create a crawl job
 */

import { db } from "@repo/database";
import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";

const crawlSchema = z.object({
	url: z.string().url(),
	indexId: z.string(),
	sitemapUrl: z.string().url().optional(),
	maxPages: z.number().int().min(1).max(10000).optional().default(100),
	selector: z.string().optional(),
});

export const crawlerApp = new Hono().post("/projects/:projectId/crawl", async (c) => {
	const gated = await requireScope("admin")(c);
	if (gated instanceof Response) return gated;
	const { verified } = gated;

	const projectId = c.req.param("projectId");
	if (projectId !== verified.organizationId) {
		return c.json({ error: "not_found", message: "Project not found" }, 404);
	}

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json", message: "Request body must be valid JSON" }, 400);
	}

	const parsed = crawlSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "invalid_input",
				message: "Invalid request body",
				details: parsed.error.flatten(),
			},
			400,
		);
	}

	const { url, indexId, maxPages, selector } = parsed.data;

	// Verify the index belongs to this org
	const index = await db.searchIndex.findUnique({
		where: { id: indexId },
		select: { organizationId: true },
	});

	if (!index || index.organizationId !== verified.organizationId) {
		return c.json({ error: "not_found", message: "Index not found" }, 404);
	}

	// Create a crawl job record
	const job = await db.searchConnectorSyncJob.create({
		data: {
			organizationId: verified.organizationId,
			indexId,
			type: "crawl",
			status: "pending",
			events: [
				{
					_type: "crawl_params",
					url,
					maxPages,
					sitemapUrl: parsed.data.sitemapUrl ?? null,
					selector: selector ?? null,
				},
			] as unknown as import("@repo/database").Prisma.InputJsonValue,
		},
	});

	return c.json({
		jobId: job.id,
		status: "pending",
	});
});
