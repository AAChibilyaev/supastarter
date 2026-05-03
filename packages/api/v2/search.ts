/**
 * V2 Search endpoints.
 *
 * Routes:
 *   POST  /v2/indexes/:indexId/search     — search a single index
 *   POST  /v2/multi-search                — multi-search
 */
import { Hono } from "hono";

import { requireScope } from "./auth";
import { applyRateLimitHeaders } from "./rate-limit";

export const searchApp = new Hono()
	// ── Single index search ─────────────────────────────────────────
	.post("/indexes/:indexId/search", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexSlug = c.req.param("indexId");
		// Placeholder: v2 search logic will be implemented in a follow-up.
		// For now, returns a structured acknowledgment indicating the
		// endpoint is operational but not yet connected to the search backend.
		const response = c.json(
			{
				message: "v2 search endpoint is active. Search implementation pending.",
				indexSlug,
			},
			200,
		);
		applyRateLimitHeaders(response, verified, 1);
		return response;
	})

	// ── Multi-search ────────────────────────────────────────────────
	.post("/multi-search", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		// Placeholder: v2 multi-search will be implemented in a follow-up.
		const response = c.json(
			{
				message: "v2 multi-search endpoint is active. Implementation pending.",
			},
			200,
		);
		applyRateLimitHeaders(response, verified, 1);
		return response;
	});
