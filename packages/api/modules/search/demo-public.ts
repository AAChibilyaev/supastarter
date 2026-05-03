import { logger } from "@repo/logs";
import type { SearchDocumentsResult } from "@repo/search";
import { aliasName, searchDocuments } from "@repo/search";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

/**
 * Public demo search endpoint.
 * No auth, no quota check. Uses demo org + index from env vars.
 * Visitors can try AACsearch with pre-loaded fashion catalog data
 * before signing up.
 */

const demoSearchInput = z.object({
	q: z.string().default("*"),
	queryBy: z.string().default("name,category,description"),
	filterBy: z.string().optional(),
	facetBy: z.string().default("category,brand,color,material"),
	sortBy: z.string().optional(),
	perPage: z.number().int().min(1).max(50).default(20),
	page: z.number().int().min(1).max(100).default(1),
});

export const demoApp = new Hono()
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type"],
			allowMethods: ["POST", "OPTIONS"],
			maxAge: 600,
		}),
	)
	.post("/demo/search", async (c) => {
		const demoOrgId = process.env.DEMO_ORG_ID;
		const demoIndexSlug = process.env.DEMO_INDEX_SLUG;

		if (!demoOrgId || !demoIndexSlug) {
			return c.json(
				{
					error: "demo_not_configured",
					message:
						"Demo is not configured. Set DEMO_ORG_ID and DEMO_INDEX_SLUG env vars.",
				},
				503,
			);
		}

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			body = {};
		}

		const parsed = demoSearchInput.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error }, 400);
		}

		try {
			const result: SearchDocumentsResult = await searchDocuments({
				alias: aliasName(demoOrgId, demoIndexSlug),
				tenantId: demoOrgId,
				q: parsed.data.q,
				queryBy: parsed.data.queryBy,
				filterBy: parsed.data.filterBy,
				facetBy: parsed.data.facetBy,
				sortBy: parsed.data.sortBy,
				perPage: parsed.data.perPage,
				page: parsed.data.page,
			});

			const hits =
				result.hits?.map((hit: unknown) => {
					const doc = hit as {
						document?: Record<string, unknown>;
						highlight?: Record<string, unknown>;
						text_match_info?: { score?: number };
					};
					return {
						...doc.document,
						_highlight: doc.highlight,
						_score: doc.text_match_info?.score,
					};
				}) ?? [];

			return c.json({
				found: result.found,
				page: result.page,
				hits,
				facet_counts: result.facetCounts ?? [],
				search_time_ms: result.searchTimeMs ?? 0,
			});
		} catch (error) {
			logger.error("Demo search failed", { error });
			return c.json({ error: "search_failed", message: "Search request failed" }, 502);
		}
	});
