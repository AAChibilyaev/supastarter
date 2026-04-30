import { aggregateSearchUsage, recordSearchUsage } from "@repo/database";
import { logger } from "@repo/logs";
import { aliasName, multiSearchDocuments, searchDocuments } from "@repo/search";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { quotaCheck } from "../entitlements/middleware/quota-check";
import { combineFilters, gatePublicSearchRequest } from "./lib/public-auth";

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

const multiSearchInput = z.object({
	searches: z.array(publicSearchInput).min(1).max(20),
});

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
		const slug = c.req.param("slug");
		const gated = await gatePublicSearchRequest(c, new Set([slug]));
		if (gated instanceof Response) return gated;
		const { verified, scopedFilter } = gated;

		// Plan quota check
		const quota = await quotaCheck(c, verified.organizationId, "search");
		if (!quota.allowed) {
			return c.json({ error: quota.error ?? "quota_exceeded" }, 429);
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
				filterBy: combineFilters(scopedFilter, parsed.data.filterBy),
			});

			void recordSearchUsage({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				type: "search_query",
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
	})
	.post("/search/public/multi", async (c) => {
		// Federated search across the SAME index (current key model is per-index).
		const gated = await gatePublicSearchRequest(c);
		if (gated instanceof Response) return gated;
		const { verified, scopedFilter } = gated;

		// Plan quota check
		const quotaMulti = await quotaCheck(c, verified.organizationId, "search");
		if (!quotaMulti.allowed) {
			return c.json({ error: quotaMulti.error ?? "quota_exceeded" }, 429);
		}

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			body = {};
		}

		const parsed = multiSearchInput.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: z.treeifyError(parsed.error) }, 400);
		}

		try {
			const alias = aliasName(verified.organizationId, verified.indexSlug);
			const results = await multiSearchDocuments(
				parsed.data.searches.map((s) => ({
					alias,
					tenantId: verified.organizationId,
					...s,
					filterBy: combineFilters(scopedFilter, s.filterBy),
				})),
			);

			void recordSearchUsage({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				type: "search_query",
				count: parsed.data.searches.length,
			}).catch((error) => logger.error("Could not record multi-search usage", { error }));

			return c.json({
				results: results.map((r) => ({
					hits: r.hits,
					found: r.found,
					page: r.page,
					perPage: r.perPage,
					facetCounts: r.facetCounts,
					searchTimeMs: r.searchTimeMs,
				})),
			});
		} catch (error) {
			logger.error("Public multi-search failed", { error, indexId: verified.indexId });
			return c.json({ error: "search_failed" }, 502);
		}
	});

export { aggregateSearchUsage };
