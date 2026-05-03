/**
 * SCIM Configuration Management API.
 *
 * Manages SCIM IdP connection settings per organization.
 * These endpoints are separate from the SCIM v2 protocol endpoints (scim-public.ts).
 *
 * Endpoints:
 *   GET    /api/scim/config/:orgId           — Get SCIM configuration
 *   POST   /api/scim/config/:orgId           — Create/update SCIM configuration
 *   DELETE /api/scim/config/:orgId           — Delete SCIM configuration
 *   POST   /api/scim/config/:orgId/regenerate-token — Regenerate bearer token
 *   POST   /api/scim/config/:orgId/test      — Test IdP connection
 *   GET    /api/scim/config/:orgId/logs      — Paginated audit logs
 *   GET    /api/scim/config/:orgId/logs/export — CSV export of logs
 *
 * Auth: Session cookie (Better Auth) with org admin/owner role
 */

import { createHash, randomBytes } from "node:crypto";

import { auth } from "@repo/auth";
import { db } from "@repo/database";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";

// ─── Helpers ─────────────────────────────────────────────────

const SCIM_TOKEN_PREFIX = "aa_scim_";
const PREFIX_DISPLAY_LENGTH = 12;

function generateScimToken(): { rawToken: string; hash: string; prefix: string } {
	const body = randomBytes(32).toString("base64url");
	const rawToken = `${SCIM_TOKEN_PREFIX}${body}`;
	return {
		rawToken,
		hash: createHash("sha256").update(rawToken).digest("hex"),
		prefix: rawToken.slice(0, PREFIX_DISPLAY_LENGTH),
	};
}

// ─── Auth middleware ───────────────────────────────────────────

/**
 * Extract session from the request and verify the user is an admin/owner of the org.
 * Returns the userId on success, or sends an error response and returns null.
 */
async function requireOrgAdmin(c: Context, orgId: string): Promise<{ userId: string } | null> {
	try {
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (!session?.session?.userId) {
			c.status(401);
			return null;
		}

		const userId = session.session.userId;

		// Verify membership with admin/owner role
		const member = await db.member.findUnique({
			where: {
				organizationId_userId: { organizationId: orgId, userId },
			},
		});

		if (!member || (member.role !== "owner" && member.role !== "admin")) {
			c.status(403);
			return null;
		}

		return { userId };
	} catch {
		c.status(401);
		return null;
	}
}

// ─── Zod schema for create/update ─────────────────────────────

const upsertConfigSchema = z.object({
	provider: z.enum(["okta", "azure_ad", "google_workspace", "keycloak", "other"]).optional(),
	endpointUrl: z.string().url().optional().nullable(),
	syncEnabled: z.boolean().optional(),
});

// ─── Router ───────────────────────────────────────────────────

export const scimConfigRouter = new Hono()
	.basePath("/scim/config")

	// ── Get SCIM configuration ─────────────────────────────────
	.get("/:orgId", async (c) => {
		const orgId = c.req.param("orgId");
		const authResult = await requireOrgAdmin(c, orgId);
		if (!authResult) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const config = await db.scimConfiguration.findUnique({
			where: { organizationId: orgId },
			select: {
				id: true,
				organizationId: true,
				provider: true,
				bearerTokenPrefix: true,
				syncEnabled: true,
				lastSyncAt: true,
				lastSyncStatus: true,
				endpointUrl: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!config) {
			return c.json({ error: "SCIM configuration not found" }, 404);
		}

		return c.json(config);
	})

	// ── Create/update SCIM configuration ───────────────────────
	.post("/:orgId", async (c) => {
		const orgId = c.req.param("orgId");
		const authResult = await requireOrgAdmin(c, orgId);
		if (!authResult) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const body = await c.req.json().catch(() => null);
		if (!body) {
			return c.json({ error: "Invalid JSON body" }, 400);
		}

		const parsed = upsertConfigSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "Invalid request body", issues: parsed.error.issues }, 400);
		}

		// Generate a new bearer token on creation
		const token = generateScimToken();

		// Check if config already exists
		const existing = await db.scimConfiguration.findUnique({
			where: { organizationId: orgId },
		});

		if (existing) {
			// Update existing config
			const updated = await db.scimConfiguration.update({
				where: { organizationId: orgId },
				data: {
					...(parsed.data.provider !== undefined && {
						provider: parsed.data.provider,
					}),
					...(parsed.data.endpointUrl !== undefined && {
						endpointUrl: parsed.data.endpointUrl,
					}),
					...(parsed.data.syncEnabled !== undefined && {
						syncEnabled: parsed.data.syncEnabled,
					}),
				},
			});

			await db.scimAuditLog.create({
				data: {
					organizationId: orgId,
					action: "config_updated",
					target: "config",
					success: true,
					performedBy: authResult.userId,
				},
			});

			return c.json({
				id: updated.id,
				organizationId: updated.organizationId,
				provider: updated.provider,
				bearerTokenPrefix: updated.bearerTokenPrefix,
				syncEnabled: updated.syncEnabled,
				lastSyncAt: updated.lastSyncAt,
				lastSyncStatus: updated.lastSyncStatus,
				endpointUrl: updated.endpointUrl,
				createdAt: updated.createdAt,
				updatedAt: updated.updatedAt,
			});
		}

		// Create new config
		const created = await db.scimConfiguration.create({
			data: {
				organizationId: orgId,
				provider: parsed.data.provider ?? "other",
				bearerTokenHash: token.hash,
				bearerTokenPrefix: token.prefix,
				endpointUrl: parsed.data.endpointUrl ?? null,
				syncEnabled: parsed.data.syncEnabled ?? false,
			},
		});

		await db.scimAuditLog.create({
			data: {
				organizationId: orgId,
				action: "config_created",
				target: "config",
				success: true,
				performedBy: authResult.userId,
			},
		});

		return c.json(
			{
				id: created.id,
				organizationId: created.organizationId,
				provider: created.provider,
				bearerTokenPrefix: created.bearerTokenPrefix,
				bearerToken: token.rawToken,
				syncEnabled: created.syncEnabled,
				lastSyncAt: created.lastSyncAt,
				lastSyncStatus: created.lastSyncStatus,
				endpointUrl: created.endpointUrl,
				createdAt: created.createdAt,
				updatedAt: created.updatedAt,
			},
			201,
		);
	})

	// ── Delete SCIM configuration ──────────────────────────────
	.delete("/:orgId", async (c) => {
		const orgId = c.req.param("orgId");
		const authResult = await requireOrgAdmin(c, orgId);
		if (!authResult) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const existing = await db.scimConfiguration.findUnique({
			where: { organizationId: orgId },
		});

		if (!existing) {
			return c.json({ error: "SCIM configuration not found" }, 404);
		}

		await db.scimConfiguration.delete({
			where: { organizationId: orgId },
		});

		await db.scimAuditLog.create({
			data: {
				organizationId: orgId,
				action: "config_deleted",
				target: "config",
				success: true,
				performedBy: authResult.userId,
			},
		});

		return c.body(null, 204);
	})

	// ── Regenerate bearer token ────────────────────────────────
	.post("/:orgId/regenerate-token", async (c) => {
		const orgId = c.req.param("orgId");
		const authResult = await requireOrgAdmin(c, orgId);
		if (!authResult) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const existing = await db.scimConfiguration.findUnique({
			where: { organizationId: orgId },
		});

		if (!existing) {
			return c.json({ error: "SCIM configuration not found" }, 404);
		}

		const token = generateScimToken();

		await db.scimConfiguration.update({
			where: { organizationId: orgId },
			data: {
				bearerTokenHash: token.hash,
				bearerTokenPrefix: token.prefix,
			},
		});

		await db.scimAuditLog.create({
			data: {
				organizationId: orgId,
				action: "token_regenerated",
				target: "config",
				success: true,
				performedBy: authResult.userId,
			},
		});

		return c.json({
			bearerToken: token.rawToken,
			bearerTokenPrefix: token.prefix,
		});
	})

	// ── Test IdP connection ────────────────────────────────────
	.post("/:orgId/test", async (c) => {
		const orgId = c.req.param("orgId");
		const authResult = await requireOrgAdmin(c, orgId);
		if (!authResult) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const config = await db.scimConfiguration.findUnique({
			where: { organizationId: orgId },
		});

		if (!config) {
			return c.json({ error: "SCIM configuration not found" }, 404);
		}

		// Attempt a test connection to the SCIM ServiceProviderConfig endpoint
		let connectionOk = false;
		let detail = "";

		try {
			if (config.endpointUrl) {
				const response = await fetch(
					`${config.endpointUrl.replace(/\/+$/, "")}/ServiceProviderConfig`,
					{
						headers: {
							Authorization: `Bearer ${config.bearerTokenPrefix}`,
						},
						signal: AbortSignal.timeout(10_000),
					},
				);
				connectionOk = response.ok;
				detail = connectionOk
					? `Connected successfully (HTTP ${response.status})`
					: `Connection failed (HTTP ${response.status})`;
			} else {
				// For built-in providers, check that the API server is live
				const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3001";
				const response = await fetch(`${baseUrl}/api/scim/v2/ServiceProviderConfig`, {
					headers: {
						Authorization: `Bearer ${config.bearerTokenPrefix}`,
					},
					signal: AbortSignal.timeout(10_000),
				});
				connectionOk = response.ok;
				detail = connectionOk
					? `Internal SCIM endpoint reachable (HTTP ${response.status})`
					: `Internal SCIM endpoint check failed (HTTP ${response.status})`;
			}
		} catch (err) {
			connectionOk = false;
			detail = err instanceof Error ? err.message : "Unknown connection error";
		}

		await db.scimAuditLog.create({
			data: {
				organizationId: orgId,
				action: "test_connection",
				target: "config",
				success: connectionOk,
				details: detail,
				performedBy: authResult.userId,
			},
		});

		return c.json({
			success: connectionOk,
			detail,
		});
	})

	// ── Get audit logs (paginated) ────────────────────────────
	.get("/:orgId/logs", async (c) => {
		const orgId = c.req.param("orgId");
		const authResult = await requireOrgAdmin(c, orgId);
		if (!authResult) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const page = Math.max(1, Number(c.req.query("page")) || 1);
		const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
		const skip = (page - 1) * limit;

		const action = c.req.query("action") ?? undefined;
		const success = c.req.query("success") ?? undefined;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: Record<string, any> = { organizationId: orgId };
		if (action) {
			where.action = action;
		}
		if (success === "true") {
			where.success = true;
		} else if (success === "false") {
			where.success = false;
		}

		const [logs, total] = await Promise.all([
			db.scimAuditLog.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
			}),
			db.scimAuditLog.count({ where }),
		]);

		return c.json({
			logs,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	})

	// ── Export logs as CSV ─────────────────────────────────────
	.get("/:orgId/logs/export", async (c) => {
		const orgId = c.req.param("orgId");
		const authResult = await requireOrgAdmin(c, orgId);
		if (!authResult) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const action = c.req.query("action") ?? undefined;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: Record<string, any> = { organizationId: orgId };
		if (action) {
			where.action = action;
		}

		const logs = await db.scimAuditLog.findMany({
			where,
			orderBy: { createdAt: "desc" },
		});

		// Build CSV
		const header =
			"id,organizationId,action,target,success,details,performedBy,ipAddress,createdAt\n";
		const rows = logs
			.map(
				(l) =>
					`${escapeCsv(l.id)},${escapeCsv(l.organizationId)},${escapeCsv(l.action)},${escapeCsv(l.target ?? "")},${l.success ? "true" : "false"},${escapeCsv(l.details ?? "")},${escapeCsv(l.performedBy ?? "")},${escapeCsv(l.ipAddress ?? "")},${l.createdAt.toISOString()}`,
			)
			.join("\n");

		c.header("Content-Type", "text/csv; charset=utf-8");
		c.header(
			"Content-Disposition",
			`attachment; filename="scim-audit-logs-${orgId}-${new Date().toISOString().slice(0, 10)}.csv"`,
		);

		return c.body(header + rows);
	});

/**
 * Escape a value for CSV: wrap in quotes if it contains comma, quote, or newline.
 */
function escapeCsv(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}
