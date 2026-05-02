/**
 * Analytics event capture endpoint — called by the hosted widget and any
 * first-party SDK to record search/click/zero-result/filter events.
 *
 * Auth: same `ss_search_*` (or `ss_scoped_*`) Bearer used by `/search/public/*`.
 * Spec: `docs/plans/aacsearch/04-connectors-widget.md` §Event schema.
 *
 * PII posture: no full IP, no email. UA capped to 256 chars. Metadata is opaque
 * but capped at 4KB JSON (10K char input window before parse).
 */

import { recordSearchUsage, type Prisma } from "@repo/database";
import { logger } from "@repo/logs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { gatePublicSearchRequest } from "./lib/public-auth";

const eventSchema = z.object({
	type: z.enum(["search_query", "zero_results", "result_click", "widget_open", "filter_used"]),
	sessionId: z.string().min(1).max(64).optional(),
	anonymousUserId: z.string().min(1).max(64).optional(),
	query: z.string().max(512).optional(),
	productId: z.string().max(128).optional(),
	position: z.number().int().min(1).max(10_000).optional(),
	filters: z.record(z.string(), z.unknown()).optional(),
	sort: z.string().max(128).optional(),
	locale: z.string().max(16).optional(),
	referrer: z.string().max(512).optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

const trackInputSchema = z.union([
	eventSchema,
	z.object({
		events: z.array(eventSchema).min(1).max(50),
		// sendBeacon cannot set Authorization headers; apiKey in body is the fallback.
		apiKey: z.string().max(256).optional(),
	}),
]);

const TYPE_TO_USAGE = {
	search_query: "search_query",
	zero_results: "zero_results",
	result_click: "click",
	widget_open: "widget_open",
	filter_used: "filter_applied",
} as const;

function capUa(ua: string | undefined): string | null {
	if (!ua) return null;
	return ua.slice(0, 256);
}

export const eventsApp = new Hono()
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["POST", "OPTIONS"],
			maxAge: 600,
		}),
	)
	.post("/events/track", async (c) => {
		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json" }, 400);
		}

		const parsed = trackInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: z.treeifyError(parsed.error) }, 400);
		}

		// sendBeacon path: no Authorization header available — use apiKey from body instead.
		const bodyApiKey =
			"apiKey" in parsed.data ? (parsed.data.apiKey as string | undefined) : undefined;
		const gated = await gatePublicSearchRequest(c, undefined, bodyApiKey);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const events = "events" in parsed.data ? parsed.data.events : [parsed.data];
		const ua = capUa(c.req.header("user-agent") ?? undefined);

		const results = await Promise.allSettled(
			events.map((ev) => {
				const meta: Record<string, unknown> = {
					sessionId: ev.sessionId ?? null,
					anonymousUserId: ev.anonymousUserId ?? null,
					query: ev.query ?? null,
					productId: ev.productId ?? null,
					position: ev.position ?? null,
					filters: ev.filters ?? null,
					sort: ev.sort ?? null,
					locale: ev.locale ?? null,
					referrer: ev.referrer ?? null,
					ua,
					extra: ev.metadata ?? null,
				};
				return recordSearchUsage({
					indexId: verified.indexId,
					organizationId: verified.organizationId,
					type: TYPE_TO_USAGE[ev.type],
					metadata: meta as Prisma.InputJsonValue,
				});
			}),
		);

		const accepted = results.filter((r) => r.status === "fulfilled").length;
		const rejected = results.length - accepted;
		if (rejected > 0) {
			logger.warn("Some analytics events failed to persist", {
				rejected,
				accepted,
				indexId: verified.indexId,
			});
		}

		return c.json({ accepted, rejected });
	});
