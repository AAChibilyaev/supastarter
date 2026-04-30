import {
	aggregateSearchUsage,
	incrementRateLimitBucket,
	recordSearchUsage,
} from "@repo/database";
import { logger } from "@repo/logs";
import { aliasName, searchDocuments, verifySearchApiKey } from "@repo/search";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { resolveOrgPlanQuota } from "./lib/quota";
import { verifyScopedSearchToken } from "./lib/scoped-token";

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
const SCOPED_PREFIX = "ss_scoped_";

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
		const rawToken = auth.slice(BEARER_PREFIX.length).trim();
		if (!rawToken) {
			return c.json({ error: "missing_bearer_token" }, 401);
		}

		// Two token forms: native search key (ss_search_*) OR scoped token (ss_scoped_*).
		// Scoped tokens carry an additional filter the client cannot remove.
		let scopedFilter: string | undefined;
		let parentRawKey = rawToken;
		if (rawToken.startsWith(SCOPED_PREFIX)) {
			const decoded = await verifyScopedSearchToken(rawToken);
			if (!decoded) {
				return c.json({ error: "invalid_or_expired_scoped_token" }, 401);
			}
			scopedFilter = decoded.filterBy;
			parentRawKey = decoded.parentRawKey;
		}

		const verified = await verifySearchApiKey(parentRawKey, "search");
		if (!verified) {
			return c.json({ error: "invalid_or_revoked_key" }, 401);
		}

		const slug = c.req.param("slug");
		if (slug !== verified.indexSlug) {
			return c.json({ error: "key_does_not_match_index" }, 403);
		}

		// 1. Per-key allowed origins (empty list = wildcard for backwards compatibility).
		if (verified.allowedOrigins.length > 0) {
			const origin = c.req.header("origin") ?? "";
			if (!verified.allowedOrigins.includes(origin)) {
				return c.json({ error: "origin_not_allowed" }, 403);
			}
		}

		// 2. Per-key sliding window rate limit.
		const used = await incrementRateLimitBucket(verified.keyId);
		if (used > verified.rateLimitPerMinute) {
			return c.json({ error: "rate_limited", limit: verified.rateLimitPerMinute }, 429);
		}

		// 3. Per-org monthly quota by plan.
		const quota = await resolveOrgPlanQuota(verified.organizationId);
		if (quota.searchPerMonth > 0 && quota.searchUsedThisPeriod >= quota.searchPerMonth) {
			return c.json(
				{
					error: "quota_exceeded",
					limit: quota.searchPerMonth,
					used: quota.searchUsedThisPeriod,
					reset: quota.periodEnd,
				},
				402,
			);
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

		// Combine scoped token's filter (if any) with caller-provided filter.
		const combinedFilter = [scopedFilter, parsed.data.filterBy]
			.filter(Boolean)
			.map((f) => `(${f})`)
			.join(" && ") || undefined;

		try {
			const result = await searchDocuments({
				alias: aliasName(verified.organizationId, verified.indexSlug),
				tenantId: verified.organizationId,
				...parsed.data,
				filterBy: combinedFilter,
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

// keep cleanup helper exported so the cron task can reach it without circular deps
export { aggregateSearchUsage };
