import { incrementRateLimitBucket } from "@repo/database";
import { verifySearchApiKey, type VerifiedSearchKey } from "@repo/search";
import type { Context } from "hono";

import { resolveOrgPlanQuota } from "./quota";
import { verifyScopedSearchToken } from "./scoped-token";

const BEARER_PREFIX = "Bearer ";
const SCOPED_PREFIX = "ss_scoped_";

export interface PublicSearchAuth {
	verified: VerifiedSearchKey;
	scopedFilter?: string;
}

/**
 * Shared auth/origin/rate-limit/quota gate for any public search route.
 * Returns either a typed success or an HTTP Response (caller forwards it).
 */
export async function gatePublicSearchRequest(
	c: Context,
	allowedSlugs?: Set<string>,
): Promise<PublicSearchAuth | Response> {
	const auth = c.req.header("authorization") ?? "";
	if (!auth.startsWith(BEARER_PREFIX)) {
		return c.json({ error: "missing_bearer_token" }, 401);
	}
	const rawToken = auth.slice(BEARER_PREFIX.length).trim();
	if (!rawToken) {
		return c.json({ error: "missing_bearer_token" }, 401);
	}

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

	if (allowedSlugs && !allowedSlugs.has(verified.indexSlug)) {
		return c.json({ error: "key_does_not_match_index" }, 403);
	}

	if (verified.allowedOrigins.length > 0) {
		const origin = c.req.header("origin") ?? "";
		if (!verified.allowedOrigins.includes(origin)) {
			return c.json({ error: "origin_not_allowed" }, 403);
		}
	}

	const used = await incrementRateLimitBucket(verified.keyId);
	if (used > verified.rateLimitPerMinute) {
		return c.json({ error: "rate_limited", limit: verified.rateLimitPerMinute }, 429);
	}

	const quota = await resolveOrgPlanQuota(verified.organizationId);
	if (quota.searchPerMonth > 0 && quota.searchQueriesUsedThisPeriod >= quota.searchPerMonth) {
		return c.json(
			{
				error: "quota_exceeded",
				limit: quota.searchPerMonth,
				used: quota.searchQueriesUsedThisPeriod,
				reset: quota.periodEnd,
			},
			402,
		);
	}

	return { verified, scopedFilter };
}

export function combineFilters(...parts: Array<string | undefined>): string | undefined {
	const cleaned = parts.filter((f): f is string => Boolean(f && f.trim().length > 0));
	if (cleaned.length === 0) return undefined;
	return cleaned.map((f) => `(${f})`).join(" && ");
}
