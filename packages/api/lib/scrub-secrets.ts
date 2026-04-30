/**
 * Centralized secret scrubber for logger payloads + error responses.
 * Applied to anything that may contain bearer tokens, API keys, hashes,
 * webhook secrets, or PII before it leaves the server boundary.
 *
 * Pattern: prefer-allowlist for known sensitive keys + regex fallback for
 * tokens-by-shape (ss_search_*, ss_connector_*, ss_scoped_*, sk_*, Bearer).
 */

const SENSITIVE_KEYS = new Set([
	"authorization",
	"cookie",
	"setCookie",
	"set-cookie",
	"apiKey",
	"apikey",
	"api_key",
	"hash",
	"hashedKey",
	"hashed_key",
	"password",
	"passwordHash",
	"rawKey",
	"raw_key",
	"secret",
	"token",
	"accessToken",
	"refreshToken",
	"idToken",
	"webhookSecret",
	"webhook_secret",
	"signature",
]);

const TOKEN_SHAPE =
	/\b(ss_search_|ss_connector_|ss_scoped_|sk_|Bearer\s+)[A-Za-z0-9._\-+/=]{12,}\b/g;

/**
 * Replaces tokens-by-shape with `<redacted>` while preserving prefix
 * for forensic correlation (e.g. `ss_search_<redacted>`).
 */
export function scrubString(value: string): string {
	return value.replace(TOKEN_SHAPE, (_match, prefix) => `${prefix}<redacted>`);
}

export function scrubValue(value: unknown, depth = 0): unknown {
	if (depth > 6) return value;
	if (value == null) return value;
	if (typeof value === "string") return scrubString(value);
	if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
	if (typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			if (SENSITIVE_KEYS.has(k.toLowerCase())) {
				out[k] = "<redacted>";
			} else {
				out[k] = scrubValue(v, depth + 1);
			}
		}
		return out;
	}
	return value;
}
