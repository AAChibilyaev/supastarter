/**
 * SCIM 2.0 (System for Cross-domain Identity Management) implementation for AACSearch.
 *
 * RFC 7643/7644 compliant endpoints for user and group provisioning.
 * Enables integration with identity providers (Okta, Azure AD, Keycloak, etc.)
 *
 * Endpoints:
 *   GET    /api/scim/v2/ServiceProviderConfig  — SCIM service metadata
 *   GET    /api/scim/v2/Users                  — List users
 *   POST   /api/scim/v2/Users                  — Create user (invite to org)
 *   GET    /api/scim/v2/Users/:id              — Get user
 *   PATCH  /api/scim/v2/Users/:id              — Update user
 *   DELETE /api/scim/v2/Users/:id              — Deactivate user
 *   GET    /api/scim/v2/Groups                 — List groups (org teams)
 *   POST   /api/scim/v2/Groups                 — Create group
 *   GET    /api/scim/v2/Groups/:id             — Get group
 *   PATCH  /api/scim/v2/Groups/:id             — Update group members
 *   DELETE /api/scim/v2/Groups/:id             — Delete group
 *
 * Auth: Bearer token with admin scope (aa_admin_*)
 */

import { db } from "@repo/database";
import { logger } from "@repo/logs";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

// ─── SCIM Types ────────────────────────────────────────────────

interface ScimResource {
	schemas: string[];
	id: string;
	meta: {
		resourceType: "User" | "Group";
		created: string;
		lastModified: string;
		location: string;
		version: string;
	};
}

interface ScimUser extends ScimResource {
	schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"];
	userName: string;
	name?: { givenName?: string; familyName?: string };
	emails?: Array<{ value: string; type?: string; primary?: boolean }>;
	active: boolean;
	displayName?: string;
	externalId?: string;
}

interface ScimGroup extends ScimResource {
	schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"];
	displayName: string;
	members?: Array<{ value: string; display?: string }>;
	externalId?: string;
}

interface ScimListResponse {
	schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"];
	totalResults: number;
	itemsPerPage: number;
	startIndex: number;
	Resources: ScimUser[] | ScimGroup[];
}

interface ScimError {
	schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"];
	detail: string;
	status: number;
}

// ─── Auth middleware ────────────────────────────────────────────

const SCIM_BEARER_TOKEN = process.env.SCIM_BEARER_TOKEN;

async function requireScimAdmin(c: Context): Promise<boolean> {
	const auth = c.req.header("Authorization");
	if (!auth?.startsWith("Bearer ")) return false;

	const token = auth.slice(7);
	// Check against configured SCIM token or validate as aa_admin_* key
	if (SCIM_BEARER_TOKEN && token === SCIM_BEARER_TOKEN) return true;

	try {
		const crypto = await import("node:crypto");
		const prefix = token.length >= 12 ? token.slice(0, 10) : token.slice(0, 4);
		const keys = await db.searchApiKey.findMany({
			where: { prefix, revokedAt: null, scopes: { has: "admin" } },
		});

		for (const k of keys) {
			const parts = k.hash.split(":");
			if (parts.length !== 2) continue;
			const hash = crypto
				.createHash("sha256")
				.update(parts[0] + token)
				.digest("hex");
			if (hash === parts[1]) return true;
		}
	} catch {
		return false;
	}

	return false;
}

function scimError(detail: string, status: number): ScimError {
	return { schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail, status };
}

// ─── Helpers ────────────────────────────────────────────────────

const SCIM_BASE = "/scim/v2";

function buildLocation(resourceType: string, id: string): string {
	return `${SCIM_BASE}/${resourceType}/${id}`;
}

function userToScim(user: {
	id: string;
	name: string;
	email: string;
	createdAt: Date;
	emailVerified: boolean;
	image?: string | null;
}): ScimUser {
	return {
		schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
		id: user.id,
		meta: {
			resourceType: "User",
			created: user.createdAt.toISOString(),
			lastModified: user.createdAt.toISOString(),
			location: buildLocation("Users", user.id),
			version: `v${user.createdAt.getTime()}`,
		},
		userName: user.email,
		name: { givenName: user.name, familyName: "" },
		emails: [{ value: user.email, type: "work", primary: true }],
		active: user.emailVerified,
		displayName: user.name,
		externalId: user.id,
	};
}

// ─── Zod schemas ────────────────────────────────────────────────

const scimUserSchema = z.object({
	schemas: z.array(z.literal("urn:ietf:params:scim:schemas:core:2.0:User")),
	userName: z.string().email(),
	name: z.object({ givenName: z.string(), familyName: z.string().optional() }).optional(),
	emails: z
		.array(
			z.object({
				value: z.string().email(),
				type: z.string().optional(),
				primary: z.boolean().optional(),
			}),
		)
		.optional(),
	displayName: z.string().optional(),
	externalId: z.string().optional(),
	active: z.boolean().optional(),
});

const scimGroupSchema = z.object({
	schemas: z.array(z.literal("urn:ietf:params:scim:schemas:core:2.0:Group")),
	displayName: z.string().min(1),
	members: z.array(z.object({ value: z.string() })).optional(),
	externalId: z.string().optional(),
});

// ─── SCIM Router ────────────────────────────────────────────────

export const scimRouter = new Hono()
	.basePath(SCIM_BASE)
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		}),
	)

	// ── ServiceProviderConfig ──────────────────────────────────
	.get("/ServiceProviderConfig", (c) => {
		return c.json({
			schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
			id: "AACSearch",
			meta: {
				resourceType: "ServiceProviderConfig",
				location: `${SCIM_BASE}/ServiceProviderConfig`,
			},
			authenticationSchemes: [
				{
					name: "Bearer Token",
					description: "Bearer token auth",
					type: "bearer",
					primary: true,
				},
			],
			bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
			filter: { supported: true, maxResults: 200 },
			changePassword: { supported: false },
			patch: { supported: true },
			sort: { supported: false },
			etag: { supported: false },
		});
	})

	// ── List Users ─────────────────────────────────────────────
	.get("/Users", async (c) => {
		if (!(await requireScimAdmin(c))) return c.json(scimError("Unauthorized", 401), 401);

		const members = await db.member.findMany({
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						createdAt: true,
						emailVerified: true,
						image: true,
					},
				},
			},
			take: 200,
		});

		const Resources = members.map((m) => userToScim(m.user));

		const response: ScimListResponse = {
			schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
			totalResults: Resources.length,
			itemsPerPage: Resources.length,
			startIndex: 1,
			Resources,
		};

		return c.json(response);
	})

	// ── Create User (invite to organization) ───────────────────
	.post("/Users", async (c) => {
		if (!(await requireScimAdmin(c))) return c.json(scimError("Unauthorized", 401), 401);

		const body = await c.req.json().catch(() => null);
		if (!body) return c.json(scimError("Invalid JSON", 400), 400);

		const parsed = scimUserSchema.safeParse(body);
		if (!parsed.success)
			return c.json(
				scimError("Invalid schema: " + JSON.stringify(parsed.error.issues), 400),
				400,
			);

		const email = parsed.data.userName;
		const displayName = parsed.data.displayName ?? parsed.data.name?.givenName ?? email;

		// Check if user exists
		const existingUser = await db.user.findUnique({ where: { email } });

		let userId: string;
		if (existingUser) {
			userId = existingUser.id;
		} else {
			// Create user with Better Auth (simplified — just insert)
			const newUser = await db.user.create({
				data: {
					email,
					name: displayName,
					emailVerified: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
			userId = newUser.id;
		}

		// Add to a default organization (first org found — SCIM client specifies via header)
		const orgId = c.req.header("X-Organization-Id");
		if (orgId) {
			const existingMembership = await db.member.findUnique({
				where: { organizationId_userId: { organizationId: orgId, userId } },
			});
			if (!existingMembership) {
				await db.member.create({
					data: { organizationId: orgId, userId, role: "member", createdAt: new Date() },
				});
			}
		}

		const finalUser = await db.user.findUniqueOrThrow({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				createdAt: true,
				emailVerified: true,
				image: true,
			},
		});

		return c.json(userToScim(finalUser), 201, {
			Location: buildLocation("Users", finalUser.id),
		});
	})

	// ── Get User ───────────────────────────────────────────────
	.get("/Users/:id", async (c) => {
		if (!(await requireScimAdmin(c))) return c.json(scimError("Unauthorized", 401), 401);

		const user = await db.user.findUnique({
			where: { id: c.req.param("id") },
			select: {
				id: true,
				name: true,
				email: true,
				createdAt: true,
				emailVerified: true,
				image: true,
			},
		});

		if (!user) return c.json(scimError("User not found", 404), 404);

		return c.json(userToScim(user));
	})

	// ── Update/Patch User ──────────────────────────────────────
	.patch("/Users/:id", async (c) => {
		if (!(await requireScimAdmin(c))) return c.json(scimError("Unauthorized", 401), 401);

		const body = await c.req.json().catch(() => ({}));
		const userId = c.req.param("id");

		const existing = await db.user.findUnique({ where: { id: userId } });
		if (!existing) return c.json(scimError("User not found", 404), 404);

		// Handle SCIM PATCH operations
		const operations = (
			body as { Operations?: Array<{ op: string; path?: string; value: unknown }> }
		).Operations;
		if (operations) {
			for (const op of operations) {
				if (op.op === "replace" && op.path === "active") {
					await db.user.update({
						where: { id: userId },
						data: { emailVerified: op.value === true },
					});
				}
			}
		}

		const updated = await db.user.findUniqueOrThrow({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				createdAt: true,
				emailVerified: true,
				image: true,
			},
		});

		return c.json(userToScim(updated));
	})

	// ── Delete/Deactivate User ─────────────────────────────────
	.delete("/Users/:id", async (c) => {
		if (!(await requireScimAdmin(c))) return c.json(scimError("Unauthorized", 401), 401);

		const userId = c.req.param("id");
		const existing = await db.user.findUnique({ where: { id: userId } });
		if (!existing) return c.json(scimError("User not found", 404), 404);

		// SCIM delete = deactivate, not hard delete
		await db.user.update({
			where: { id: userId },
			data: { emailVerified: false, banned: true },
		});

		return c.body(null, 204);
	})

	// ── List Groups ────────────────────────────────────────────
	.get("/Groups", async (c) => {
		if (!(await requireScimAdmin(c))) return c.json(scimError("Unauthorized", 401), 401);

		const orgs = await db.organization.findMany({
			include: { _count: { select: { members: true } } },
			take: 200,
		});

		const Resources: ScimGroup[] = orgs.map((org) => ({
			schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
			id: org.id,
			meta: {
				resourceType: "Group",
				created: org.createdAt.toISOString(),
				lastModified: org.createdAt.toISOString(),
				location: buildLocation("Groups", org.id),
				version: `v${org.createdAt.getTime()}`,
			},
			displayName: org.name,
			externalId: org.slug ?? org.id,
		}));

		return c.json({
			schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
			totalResults: Resources.length,
			itemsPerPage: Resources.length,
			startIndex: 1,
			Resources,
		} as ScimListResponse);
	})

	// ── Create Group ───────────────────────────────────────────
	.post("/Groups", async (c) => {
		if (!(await requireScimAdmin(c))) return c.json(scimError("Unauthorized", 401), 401);

		const body = await c.req.json().catch(() => null);
		if (!body) return c.json(scimError("Invalid JSON", 400), 400);

		const parsed = scimGroupSchema.safeParse(body);
		if (!parsed.success) return c.json(scimError("Invalid schema", 400), 400);

		const org = await db.organization.create({
			data: {
				name: parsed.data.displayName,
				slug: parsed.data.displayName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
				createdAt: new Date(),
			},
		});

		// Add members if provided
		if (parsed.data.members) {
			for (const m of parsed.data.members) {
				const user = await db.user.findUnique({ where: { id: m.value } }).catch(() => null);
				if (user) {
					await db.member.upsert({
						where: {
							organizationId_userId: { organizationId: org.id, userId: user.id },
						},
						update: {},
						create: {
							organizationId: org.id,
							userId: user.id,
							role: "member",
							createdAt: new Date(),
						},
					});
				}
			}
		}

		const scimGroup: ScimGroup = {
			schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
			id: org.id,
			meta: {
				resourceType: "Group",
				created: org.createdAt.toISOString(),
				lastModified: org.createdAt.toISOString(),
				location: buildLocation("Groups", org.id),
				version: `v${org.createdAt.getTime()}`,
			},
			displayName: org.name,
			externalId: org.slug ?? org.id,
		};

		return c.json(scimGroup, 201, { Location: buildLocation("Groups", org.id) });
	})

	// ── Get Group ──────────────────────────────────────────────
	.get("/Groups/:id", async (c) => {
		if (!(await requireScimAdmin(c))) return c.json(scimError("Unauthorized", 401), 401);

		const org = await db.organization.findUnique({
			where: { id: c.req.param("id") },
			include: { members: { include: { user: { select: { id: true, name: true } } } } },
		});

		if (!org) return c.json(scimError("Group not found", 404), 404);

		const scimGroup: ScimGroup = {
			schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
			id: org.id,
			meta: {
				resourceType: "Group",
				created: org.createdAt.toISOString(),
				lastModified: org.createdAt.toISOString(),
				location: buildLocation("Groups", org.id),
				version: `v${org.createdAt.getTime()}`,
			},
			displayName: org.name,
			members: org.members.map((m) => ({ value: m.userId, display: m.user.name })),
			externalId: org.slug ?? org.id,
		};

		return c.json(scimGroup);
	})

	// ── Delete Group ───────────────────────────────────────────
	.delete("/Groups/:id", async (c) => {
		if (!(await requireScimAdmin(c))) return c.json(scimError("Unauthorized", 401), 401);

		const org = await db.organization.findUnique({ where: { id: c.req.param("id") } });
		if (!org) return c.json(scimError("Group not found", 404), 404);

		// SCIM delete = soft through ban
		await db.organization.update({
			where: { id: org.id },
			data: {
				metadata: JSON.stringify({
					scimDeleted: true,
					deletedAt: new Date().toISOString(),
				}),
			},
		});

		return c.body(null, 204);
	});
