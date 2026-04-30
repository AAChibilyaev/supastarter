/**
 * V1 API auth middleware.
 *
 * Uses the same Bearer-token / SearchApiKey verification as public-handler.ts.
 * The raw key is verified via verifySearchApiKey from @repo/search.
 *
 * Key prefixes (roadmap — shape validation is handled by verifySearchApiKey):
 *   aa_admin_*   — server-side admin (full access)
 *   aa_write_*   — indexing only
 *   aa_search_*  — search only
 *   aa_scoped_*  — restricted frontend/search token
 *
 * For the v1 API we map:
 *   admin scope → full CRUD on projects, indexes, keys
 *   ingest scope → document write operations
 *   search scope → search endpoints only
 */

import { incrementRateLimitBucket } from "@repo/database";
import { verifySearchApiKey, type VerifiedSearchKey } from "@repo/search";
import type { Context } from "hono";

import { resolveOrgPlanQuota } from "../modules/search/lib/quota";

const BEARER_PREFIX = "Bearer ";

export interface V1Auth {
	verified: VerifiedSearchKey;
}

export async function gateV1Request(
	c: Context,
	requiredScope: "admin" | "ingest" | "search",
): Promise<V1Auth | Response> {
	const auth = c.req.header("authorization") ?? "";
	if (!auth.startsWith(BEARER_PREFIX)) {
		return c.json({ error: "unauthorized", message: "Missing Bearer token" }, 401);
	}

	const rawToken = auth.slice(BEARER_PREFIX.length).trim();
	if (!rawToken) {
		return c.json({ error: "unauthorized", message: "Empty Bearer token" }, 401);
	}

	const verified = await verifySearchApiKey(rawToken, requiredScope);
	if (!verified) {
		return c.json(
			{ error: "forbidden", message: "Invalid, expired, or unauthorized API key" },
			403,
		);
	}

	// Rate-limit every API call
	const used = await incrementRateLimitBucket(verified.keyId);
	if (used > verified.rateLimitPerMinute) {
		return c.json(
			{
				error: "rate_limited",
				message: "Rate limit exceeded",
				limit: verified.rateLimitPerMinute,
			},
			429,
		);
	}

	// Check org-level quota for write/ingest operations
	if (requiredScope === "ingest" || requiredScope === "admin") {
		const quota = await resolveOrgPlanQuota(verified.organizationId);
		if (
			quota.indexedDocuments > 0 &&
			quota.indexedDocumentsUsedThisPeriod >= quota.indexedDocuments
		) {
			return c.json(
				{
					error: "quota_exceeded",
					message: "Monthly indexing quota exceeded",
					limit: quota.indexedDocuments,
					used: quota.indexedDocumentsUsedThisPeriod,
					reset: quota.periodEnd,
				},
				402,
			);
		}
	}

	return { verified };
}

/**
 * Create a builder function that wraps gateV1Request with the required scope
 * and returns the verified context or a JSON error Response.
 */
export function requireScope(scope: "admin" | "ingest" | "search") {
	return async (c: Context): Promise<V1Auth | Response> => gateV1Request(c, scope);
}
