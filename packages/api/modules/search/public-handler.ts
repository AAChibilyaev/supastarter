import { recordSearchUsage } from "@repo/database";
import { logger } from "@repo/logs";
import { aliasName, searchDocuments, verifySearchApiKey } from "@repo/search";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

const publicSearchInput = z.object({
	q: z.string().default("*"),
	queryBy: z.string().optional(),
	filterBy: z.string().optional(),
	facetBy: z.string().optional(),
	sortBy: z.string().optional(),
	perPage: z.number().int().min(1).max(100).optional(),
	page: z.number().int().min(1).max(1000).optional(),
	highlightFields: z.string().optional(),
});

const BEARER_PREFIX = "Bearer ";

export const publicSearchApp = new Hono()
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["POST", "OPTIONS"],
			maxAge: 600,
		}),
	)
	.post("/search/public/:slug", async (c) => {
		const auth = c.req.header("authorization") ?? "";
		if (!auth.startsWith(BEARER_PREFIX)) {
			return c.json({ error: "missing_bearer_token" }, 401);
		}
		const rawKey = auth.slice(BEARER_PREFIX.length).trim();
		if (!rawKey) {
			return c.json({ error: "missing_bearer_token" }, 401);
		}

		const verified = await verifySearchApiKey(rawKey, "search");
		if (!verified) {
			return c.json({ error: "invalid_or_revoked_key" }, 401);
		}

		const slug = c.req.param("slug");
		if (slug !== verified.indexSlug) {
			return c.json({ error: "key_does_not_match_index" }, 403);
		}

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			body = {};
		}

		const parsed = publicSearchInput.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: z.treeifyError(parsed.error) }, 400);
		}

		try {
			const result = await searchDocuments({
				alias: aliasName(verified.organizationId, verified.indexSlug),
				tenantId: verified.organizationId,
				...parsed.data,
			});

			void recordSearchUsage({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				type: "search",
			}).catch((error) => logger.error("Could not record search usage", { error }));

			return c.json({
				hits: result.hits,
				found: result.found,
				page: result.page,
				perPage: result.perPage,
				facetCounts: result.facetCounts,
				searchTimeMs: result.searchTimeMs,
			});
		} catch (error) {
			logger.error("Public search failed", { error, slug, indexId: verified.indexId });
			return c.json({ error: "search_failed" }, 502);
		}
	});
