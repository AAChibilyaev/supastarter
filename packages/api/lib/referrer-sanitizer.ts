/**
 * Referrer URL sanitizer — strips query parameters from referrer URLs
 * before storing in usage events to prevent PII leakage.
 *
 * Referrer URLs often contain tracking parameters (utm_source, etc.),
 * session identifiers, or even email addresses in query strings.
 * We keep the origin and path for analytics but strip query params.
 */

/**
 * Sanitize a referrer URL by stripping its query string.
 * Returns just `origin + pathname` (e.g. `https://example.com/page`).
 * Returns null if input is null/undefined or not parseable.
 */
export function sanitizeReferrer(referrer: string | null | undefined): string | null {
	if (!referrer) return null;
	try {
		const url = new URL(referrer);
		// Keep only origin + pathname, drop query string, hash, auth
		return `${url.origin}${url.pathname}`;
	} catch {
		// Not a valid URL — return null instead of storing potentially PII data
		return null;
	}
}
