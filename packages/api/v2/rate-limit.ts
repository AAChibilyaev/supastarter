/**
 * V2 rate limiting middleware.
 *
 * Attaches `X-RateLimit-Org-*` headers to every v2 response, providing
 * organization-level rate limit visibility:
 *
 *   X-RateLimit-Org-Limit:    600
 *   X-RateLimit-Org-Remaining: 542
 *   X-RateLimit-Org-Reset:    1714771200  (Unix timestamp)
 *   X-RateLimit-Org-Policy:   key
 *
 * The headers are set AFTER auth has resolved so we know the organization
 * and key plan. This middleware runs as a response hook (onSuccess).
 */
import type { VerifiedSearchKey } from "@repo/search";

// ── Types ─────────────────────────────────────────────────────────

export interface OrgRateLimitInfo {
	/** Maximum requests per rolling window for this org */
	limit: number;
	/** Requests remaining in the current window */
	remaining: number;
	/** Unix timestamp (seconds) when the window resets */
	reset: number;
	/** The rate limit policy type */
	policy: "key" | "org";
}

// ── Public helpers ────────────────────────────────────────────────

/**
 * Build X-RateLimit-Org-* headers from per-key bucket state.
 *
 * The rate limit technically resets every minute (windowed). We use
 * the next window start as `reset`.
 */
export function buildOrgRateLimitHeaders(
	verified: VerifiedSearchKey,
	used: number,
	now: Date = new Date(),
): Record<string, string> {
	const windowMs = 60_000;
	const nextWindowStart = Math.ceil(now.getTime() / windowMs) * windowMs + windowMs;
	const remaining = Math.max(0, verified.rateLimitPerMinute - used);

	return {
		"X-RateLimit-Org-Limit": String(verified.rateLimitPerMinute),
		"X-RateLimit-Org-Remaining": String(remaining),
		"X-RateLimit-Org-Reset": String(Math.floor(nextWindowStart / 1000)),
		"X-RateLimit-Org-Policy": "key",
	};
}

/**
 * Apply rate limit headers to a Hono Response object.
 */
export function applyRateLimitHeaders(
	response: Response,
	verified: VerifiedSearchKey,
	used: number,
): void {
	const headers = buildOrgRateLimitHeaders(verified, used);
	for (const [key, value] of Object.entries(headers)) {
		response.headers.set(key, value);
	}
}
