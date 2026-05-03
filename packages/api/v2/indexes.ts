/**
 * V2 Indexes endpoints.
 *
 * Routes:
 *   GET    /v2/projects/:projectId/indexes        — list indexes
 *   POST   /v2/projects/:projectId/indexes        — create index
 *   GET    /v2/indexes/:indexId                   — get index
 *   PATCH  /v2/indexes/:indexId                   — update index
 *   DELETE /v2/indexes/:indexId                   — delete index
 *   GET    /v2/indexes/:indexId/stats             — index statistics
 */
import { db } from "@repo/database";
import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";
import { applyRateLimitHeaders } from "./rate-limit";

export const indexesApp = new Hono()
	// ── List indexes ────────────────────────────────────────────────
	.get("/projects/:projectId/indexes", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const projectId = c.req.param("projectId");

		const indexes = await db.searchIndex.findMany({
			where: { organizationId: projectId },
			include: { _count: { select: { documents: true } } },
		});

		const body = indexes.map((idx) => ({
			id: idx.id,
			slug: idx.slug,
			displayName: idx.displayName,
			enabled: idx.enabled,
			projectId: idx.organizationId,
			documentCount: idx._count.documents,
			createdAt: idx.createdAt,
			updatedAt: idx.updatedAt,
		}));

		const response = c.json(body, 200);
		applyRateLimitHeaders(response, verified, 1);
		return response;
	})

	// ── Create index ────────────────────────────────────────────────
	.post("/projects/:projectId/indexes", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const projectId = c.req.param("projectId");

		const schema = z.object({
			slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
			displayName: z.string().max(120),
			fields: z.array(
				z.object({
					name: z.string(),
					type: z.string(),
					facet: z.boolean().optional(),
					index: z.boolean().optional(),
					optional: z.boolean().optional(),
					locale: z.string().optional(),
					sort: z.boolean().optional(),
					infix: z.boolean().optional(),
				}),
			),
			defaultSortingField: z.string().optional(),
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

		const existing = await db.searchIndex.findFirst({
			where: { slug: parsed.data.slug, organizationId: projectId },
		});
		if (existing) {
			return c.json(
				{ error: "conflict", message: "Index slug already exists in this project" },
				409,
			);
		}

		const idx = await db.searchIndex.create({
			data: {
				slug: parsed.data.slug,
				displayName: parsed.data.displayName,
				organizationId: projectId,
				fields: parsed.data.fields as unknown as Record<string, unknown>[],
				defaultSortingField: parsed.data.defaultSortingField ?? null,
			},
		});

		const response = c.json(
			{
				id: idx.id,
				slug: idx.slug,
				displayName: idx.displayName,
				enabled: idx.enabled,
				projectId: idx.organizationId,
				documentCount: 0,
				createdAt: idx.createdAt,
				updatedAt: idx.updatedAt,
			},
			201,
		);
		applyRateLimitHeaders(response, verified, 1);
		return response;
	})

	// ── Get index by ID ─────────────────────────────────────────────
	.get("/indexes/:indexId", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");

		const idx = await db.searchIndex.findUnique({
			where: { id: indexId },
			include: { _count: { select: { documents: true } } },
		});

		if (!idx) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		const body = {
			id: idx.id,
			slug: idx.slug,
			displayName: idx.displayName,
			enabled: idx.enabled,
			projectId: idx.organizationId,
			fields: idx.fields,
			documentCount: idx._count.documents,
			defaultSortingField: idx.defaultSortingField,
			createdAt: idx.createdAt,
			updatedAt: idx.updatedAt,
		};

		const response = c.json(body, 200);
		applyRateLimitHeaders(response, verified, 1);
		return response;
	})

	// ── Update index ────────────────────────────────────────────────
	.patch("/indexes/:indexId", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");

		const schema = z.object({
			displayName: z.string().max(120).optional(),
			enabled: z.boolean().optional(),
			defaultSortingField: z.string().optional(),
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

		const existing = await db.searchIndex.findUnique({
			where: { id: indexId },
		});
		if (!existing) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		const updated = await db.searchIndex.update({
			where: { id: indexId },
			data: {
				...(parsed.data.displayName !== undefined && {
					displayName: parsed.data.displayName,
				}),
				...(parsed.data.enabled !== undefined && { enabled: parsed.data.enabled }),
				...(parsed.data.defaultSortingField !== undefined && {
					defaultSortingField: parsed.data.defaultSortingField,
				}),
			},
		});

		const response = c.json(
			{
				id: updated.id,
				slug: updated.slug,
				displayName: updated.displayName,
				enabled: updated.enabled,
				projectId: updated.organizationId,
				createdAt: updated.createdAt,
				updatedAt: updated.updatedAt,
			},
			200,
		);
		applyRateLimitHeaders(response, verified, 1);
		return response;
	});
