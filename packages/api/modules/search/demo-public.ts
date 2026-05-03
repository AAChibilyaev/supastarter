import { logger } from "@repo/logs";
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
					message: "Demo is not configured. Set DEMO_ORG_ID and DEMO_INDEX_SLUG env vars.",
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
			const result = await searchDocuments({
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

			return c.json({
				found: result.found,
				out_of: result.out_of,
				page: result.page,
				hits: result.hits?.map((hit) => ({
					...hit.document,
					_highlight: hit.highlight,
					_score: hit.text_match_info?.score,
				})) ?? [],
				facet_counts: result.facet_counts ?? [],
				search_time_ms: result.search_time_ms ?? 0,
			});
		} catch (error) {
			logger.error("Demo search failed", { error });
			return c.json({ error: "search_failed", message: "Search request failed" }, 502);
		}
	});
