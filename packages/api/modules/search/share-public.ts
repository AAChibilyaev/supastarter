import { createHmac, timingSafeEqual } from "node:crypto";

import { logger } from "@repo/logs";
import { aliasName, searchDocuments } from "@repo/search";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

/**
 * Share link tokens — HMAC-signed self-contained tokens.
 * No DB model needed. Token encodes: indexId, orgId, slug, expiry.
 */

const SHARE_PREFIX = "ss_share_";

interface ShareTokenPayload {
	indexId: string;
	orgId: string;
	slug: string;
	exp: number;
}

function getSecret(): string {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret) throw new Error("BETTER_AUTH_SECRET required for share links");
	return secret;
}

function signPayload(payload: string): string {
	return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function issueShareToken(input: {
	indexId: string;
	orgId: string;
	slug: string;
	expiresInDays: number;
}): { token: string; expiresAt: Date } {
	const exp = Math.floor(Date.now() / 1000) + input.expiresInDays * 86400;
	const payload: ShareTokenPayload = {
		indexId: input.indexId,
		orgId: input.orgId,
		slug: input.slug,
		exp,
	};
	const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const sig = signPayload(encoded);
	return {
		token: `${SHARE_PREFIX}${encoded}.${sig}`,
		expiresAt: new Date(exp * 1000),
	};
}

export function verifyShareToken(
	rawToken: string,
): { indexId: string; orgId: string; slug: string } | null {
	if (!rawToken.startsWith(SHARE_PREFIX)) return null;
	const body = rawToken.slice(SHARE_PREFIX.length);
	const dot = body.indexOf(".");
	if (dot < 0) return null;
	const encoded = body.slice(0, dot);
	const sig = body.slice(dot + 1);

	const expected = signPayload(encoded);
	if (expected.length !== sig.length) return null;
	try {
		if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
	} catch {
		return null;
	}

	let parsed: ShareTokenPayload;
	try {
		parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
	} catch {
		return null;
	}

	if (parsed.exp * 1000 < Date.now()) return null;
	if (!parsed.indexId || !parsed.orgId || !parsed.slug) return null;

	return {
		indexId: parsed.indexId,
		orgId: parsed.orgId,
		slug: parsed.slug,
	};
}

// ── Public Share Search Endpoint ──────────────────────────────

const generateShareInput = z.object({
	indexId: z.string(),
	orgId: z.string(),
	slug: z.string(),
});

const shareSearchInput = z.object({
	q: z.string().default("*"),
	queryBy: z.string().default("name,description"),
	filterBy: z.string().optional(),
	facetBy: z.string().optional(),
	sortBy: z.string().optional(),
	includeFields: z.string().optional(),
	perPage: z.number().int().min(1).max(50).default(12),
	page: z.number().int().min(1).max(100).default(1),
});

export const shareApp = new Hono()
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type"],
			allowMethods: ["POST", "OPTIONS"],
			maxAge: 600,
		}),
	)
	.post("/share/generate", async (c) => {
		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			body = {};
		}

		const parsed = generateShareInput.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input" }, 400);
		}

		const { token, expiresAt } = issueShareToken({
			indexId: parsed.data.indexId,
			orgId: parsed.data.orgId,
			slug: parsed.data.slug,
			expiresInDays: 30,
		});

		return c.json({ token, expiresAt: expiresAt.toISOString() });
	})
	.post("/share/search/:token", async (c) => {
		const rawToken = c.req.param("token");
		const decoded = verifyShareToken(rawToken);

		if (!decoded) {
			return c.json({ error: "invalid_or_expired_share_link" }, 401);
		}

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			body = {};
		}

		const parsed = shareSearchInput.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input" }, 400);
		}

		try {
			const result = await searchDocuments({
				alias: aliasName(decoded.orgId, decoded.slug),
				tenantId: decoded.orgId,
				q: parsed.data.q,
				queryBy: parsed.data.queryBy,
				filterBy: parsed.data.filterBy,
				facetBy: parsed.data.facetBy,
				sortBy: parsed.data.sortBy,
				perPage: parsed.data.perPage,
				page: parsed.data.page,
			});

			return c.json({
				found: result.found,
				page: result.page,
				hits:
					result.hits?.map((hit: unknown) => {
						const doc = hit as {
							document?: Record<string, unknown>;
							highlight?: Record<string, unknown>;
						};
						return { ...doc.document, _highlight: doc.highlight };
					}) ?? [],
				facet_counts: result.facetCounts ?? [],
				search_time_ms: result.searchTimeMs ?? 0,
			});
		} catch (error) {
			logger.error("Share search failed", { error });
			return c.json({ error: "search_failed" }, 502);
		}
	});
