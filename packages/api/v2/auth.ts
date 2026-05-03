/**
 * V2 API auth middleware.
 *
 * Reuses the same Bearer-token / SearchApiKey verification from @repo/search
 * but returns v2 extended error format responses.
 *
 * Bearer tokens are Search API keys with prefix `ss_search_*`.
 * Scopes: admin, ingest, search
 */
import { incrementRateLimitBucket } from "@repo/database";
import { verifySearchApiKey, type VerifiedSearchKey } from "@repo/search";
import type { Context } from "hono";

import { errorResponse } from "./errors";

const BEARER_PREFIX = "Bearer ";

/**
 * Resolved authentication context for v2 routes.
 * Available in route handlers after gateV2Request succeeds.
 */
export interface V2Auth {
	verified: VerifiedSearchKey;
}

/**
 * Gate a v2 request: verify Bearer token, check scope, enforce rate limit.
 *
 * Returns the auth context on success, or a v2-format error Response on failure.
 */
export async function gateV2Request(
	c: Context,
	requiredScope: "admin" | "ingest" | "search",
): Promise<V2Auth | Response> {
	const auth = c.req.header("authorization") ?? "";
	if (!auth.startsWith(BEARER_PREFIX)) {
		return errorResponse(c, 401, "unauthorized", "Missing Bearer token");
	}

	const rawToken = auth.slice(BEARER_PREFIX.length).trim();
	if (!rawToken) {
		return errorResponse(c, 401, "unauthorized", "Empty Bearer token");
	}

	const verified = await verifySearchApiKey(rawToken, requiredScope);
	if (!verified) {
		return errorResponse(
			c,
			403,
			"forbidden",
			"Invalid, expired, or unauthorized API key",
		);
	}

	// Rate-limit every API call (per-key sliding window)
	const used = await incrementRateLimitBucket(verified.keyId);
	if (used > verified.rateLimitPerMinute) {
		return errorResponse(
			c,
			429,
			"rate_limited",
			`Rate limit exceeded: ${verified.rateLimitPerMinute} requests per minute`,
			[
				{
					code: "rate_limit_exceeded",
					message: `Used ${used} of ${verified.rateLimitPerMinute} allowed requests`,
				},
			],
		);
	}

	return { verified };
}

/**
 * Create a builder function that wraps gateV2Request with the required scope.
 *
 * Usage:
 *   const gated = await requireScope("search")(c);
 *   if (gated instanceof Response) return gated;
 *   const { verified } = gated;
 */
export function requireScope(scope: "admin" | "ingest" | "search") {
	return async (c: Context): Promise<V2Auth | Response> => gateV2Request(c, scope);
}
