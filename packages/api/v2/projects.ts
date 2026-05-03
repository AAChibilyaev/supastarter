/**
 * V2 Projects endpoints.
 *
 * Routes:
 *   GET    /v2/projects                   — get current project
 *   POST   /v2/projects                   — create project
 *   GET    /v2/projects/:projectId        — get project by ID
 */
import { db } from "@repo/database";
import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";
import { applyRateLimitHeaders } from "./rate-limit";

export const projectsApp = new Hono()
	// ── Get current project ─────────────────────────────────────────
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
			return c.json(
				{
					error: "not_found",
					message: "Project not found",
				},
				404,
			);
		}

		const body = {
			id: org.id,
			name: org.name,
			slug: org.slug,
			logo: org.logo,
			membersCount: org._count.members,
			createdAt: org.createdAt,
			updatedAt: org.updatedAt,
		};

		// Apply rate limit headers to successful responses
		const response = c.json(body, 200);
		applyRateLimitHeaders(response, verified, 1);
		return response;
	})

	// ── Create project ──────────────────────────────────────────────
	.post("/", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

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

		const createdBody = {
			id: org.id,
			name: org.name,
			slug: org.slug,
			logo: org.logo,
			membersCount: 1,
			createdAt: org.createdAt,
			updatedAt: org.updatedAt,
		};

		const response = c.json(createdBody, 201);
		applyRateLimitHeaders(response, verified, 1);
		return response;
	})

	// ── Get project by ID ───────────────────────────────────────────
	.get("/:projectId", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const projectId = c.req.param("projectId");

		const org = await db.organization.findUnique({
			where: { id: projectId },
			include: {
				_count: { select: { members: true } },
			},
		});

		if (!org) {
			return c.json({ error: "not_found", message: "Project not found" }, 404);
		}

		const body = {
			id: org.id,
			name: org.name,
			slug: org.slug,
			logo: org.logo,
			membersCount: org._count.members,
			createdAt: org.createdAt,
			updatedAt: org.updatedAt,
		};

		const response = c.json(body, 200);
		applyRateLimitHeaders(response, verified, 1);
		return response;
	});
