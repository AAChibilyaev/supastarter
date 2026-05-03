/**
 * V1 Projects endpoints.
 *
 * In the AACsearch domain an "organization" is exposed as a "project".
 *   GET  /v1/projects        — list projects (requires admin scope)
 *   POST /v1/projects        — create project (requires admin scope)
 *   GET  /v1/projects/:id    — get single project
 */

import { db } from "@repo/database";
import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";

export const projectsApp = new Hono()
	// ── List projects ──────────────────────────────────────────────
	.get("/", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const org = await db.organization.findUnique({
			where: { id: verified.organizationId },
			include: {
				_count: { select: { members: true } },
			},
		});

		if (!org) {
			return c.json({ error: "not_found", message: "Project not found" }, 404);
		}

		return c.json({
			id: org.id,
			name: org.name,
			slug: org.slug,
			logo: org.logo,
			membersCount: org._count.members,
			createdAt: org.createdAt,
		});
	})

	// ── Create project ─────────────────────────────────────────────
	.post("/", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;

		const schema = z.object({
			name: z.string().min(1).max(120),
			slug: z
				.string()
				.min(1)
				.max(64)
				.regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase, digits, and dashes"),
			logo: z.string().url().optional(),
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

		const existing = await db.organization.findUnique({
			where: { slug: parsed.data.slug },
		});
		if (existing) {
			return c.json({ error: "conflict", message: "Project slug already exists" }, 409);
		}

		const org = await db.organization.create({
			data: {
				name: parsed.data.name,
				slug: parsed.data.slug,
				logo: parsed.data.logo ?? null,
				createdAt: new Date(),
			},
		});

		return c.json(
			{
				id: org.id,
				name: org.name,
				slug: org.slug,
				logo: org.logo,
				createdAt: org.createdAt,
			},
			201,
		);
	})

	// ── Get project by ID ──────────────────────────────────────────
	.get("/:id", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const projectId = c.req.param("id");
		if (projectId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Project not found" }, 404);
		}

		const org = await db.organization.findUnique({
			where: { id: projectId },
			include: {
				_count: { select: { members: true } },
			},
		});

		if (!org) {
			return c.json({ error: "not_found", message: "Project not found" }, 404);
		}

		return c.json({
			id: org.id,
			name: org.name,
			slug: org.slug,
			logo: org.logo,
			membersCount: org._count.members,
			createdAt: org.createdAt,
		});
	});
