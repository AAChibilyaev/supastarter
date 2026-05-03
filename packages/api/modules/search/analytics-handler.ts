/**
 * Analytics events endpoint — called by the frontend search widget / client SDK.
 *
 * Auth: Bearer token (ss_search_* prefix, hashed in SearchApiKey).
 * Tokens must have "search" scope.
 *
 * Public endpoint (no session required) — auth is via bearer token.
 * All payloads validated with Zod. No PII is stored.
 */

import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { isForwardableEvent, widgetEventToAnalyticsEvent, sendAnalyticsEvent } from "@repo/search";
import { verifySearchApiKey } from "@repo/search";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

// ─── Event types ──────────────────────────────────────────────

const EVENT_TYPES = [
	"search_query",
	"zero_results",
	"result_click",
	"widget_open",
	"filter_used",
	"conversion",
	"visit",
] as const;

// ─── Zod schema ───────────────────────────────────────────────

const analyticsEventSchema = z.object({
	type: z.enum(EVENT_TYPES),
	query: z.string().max(500).optional(),
	sessionId: z.string().max(128).optional(),
	productId: z.string().max(128).optional(),
	position: z.number().int().min(0).optional(),
	filters: z.record(z.string(), z.unknown()).optional(),
	sort: z.string().max(64).optional(),
	locale: z.string().max(10).optional(),
	userAgent: z.string().max(512).optional(),
	referrer: z.string().max(1024).optional(),
});

// ─── Auth middleware ──────────────────────────────────────────

interface VerifiedAnalyticsKey {
	keyId: string;
	indexId: string;
	organizationId: string;
}

async function gateAnalyticsRequest(c: Context): Promise<VerifiedAnalyticsKey | Response> {
	const auth = c.req.header("Authorization");
	if (!auth?.startsWith("Bearer ")) {
		return c.json({ error: "missing_bearer_token" }, 401);
	}

	const rawToken = auth.slice(7).trim();
	if (!rawToken) {
		return c.json({ error: "missing_bearer_token" }, 401);
	}

	const verified = await verifySearchApiKey(rawToken, "search");
	if (!verified) {
		return c.json({ error: "invalid_or_revoked_key" }, 401);
	}

	return {
		keyId: verified.keyId,
		indexId: verified.indexId,
		organizationId: verified.organizationId,
	};
}

// ─── Routes ───────────────────────────────────────────────────

export const analyticsApp = new Hono()
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["POST", "OPTIONS"],
			maxAge: 600,
		}),
	)

	// POST /api/events/:projectId
	.post("/events/:projectId", async (c) => {
		const gated = await gateAnalyticsRequest(c);
		if (gated instanceof Response) return gated;

		if (c.req.param("projectId") !== gated.organizationId) {
			return c.json({ error: "project_not_found" }, 404);
		}

		const body = await c.req.json().catch(() => null);
		if (!body) return c.json({ error: "invalid_json" }, 400);

		const parsed = analyticsEventSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
		}

		const {
			type,
			query,
			sessionId,
			productId,
			position: _position,
			filters: _filters,
			sort: _sort,
			locale: _locale,
			userAgent: _userAgent,
			referrer: _referrer,
		} = parsed.data;

		try {
			await db.searchUsageEvent.create({
				data: {
					indexId: gated.indexId,
					organizationId: gated.organizationId,
					type,
					count: 1,
				},
			});

			// Forward event to Typesense analytics (fire-and-forget)
			// This feeds counter rules (popularity ranking) and log rules (ML data).
			if (isForwardableEvent(type)) {
				const meta: Record<string, unknown> = {
					sessionId: sessionId ?? null,
					query: query ?? null,
					productId: productId ?? null,
					position: _position ?? null,
					filters: _filters ?? null,
					sort: _sort ?? null,
					locale: _locale ?? null,
					referrer: _referrer ?? null,
					ua: _userAgent ?? null,
				};
				const tsEvent = widgetEventToAnalyticsEvent(type, meta);
				if (tsEvent) {
					void sendAnalyticsEvent(tsEvent);
				}
			}

			logger.debug("Analytics event recorded", {
				type,
				indexId: gated.indexId,
				organizationId: gated.organizationId,
				// Non-PII metadata logged for debugging only
				...(query ? { queryLength: query.length } : {}),
				...(sessionId ? { hasSession: true } : {}),
				...(productId ? { hasProduct: true } : {}),
			});

			return c.json({ status: "ok" });
		} catch (error) {
			logger.error("Failed to record analytics event", {
				error,
				type,
				indexId: gated.indexId,
				organizationId: gated.organizationId,
			});
			return c.json({ error: "event_failed" }, 502);
		}
	});
