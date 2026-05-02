/**
 * Shared configuration and helpers for AACsearch load tests.
 *
 * Override via `-e KEY=VALUE` on the k6 command line.
 */

// ── Environment overrides ─────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL ?? "http://localhost:3010";
const TYPESENSE = __ENV.TYPESENSE_URL ?? "http://localhost:8108";
const API_KEY = __ENV.API_KEY ?? "";
const INDEX_ID = __ENV.INDEX_ID ?? "";
const INDEX_SLUG = __ENV.INDEX_SLUG ?? "";

// ── Thresholds shared across scenarios ────────────────────────────
const THRESHOLDS = {
	// Baseline: p99 < 100ms at target RPS
	http_req_duration: ["p(99)<100", "p(95)<50", "p(90)<30"],
	// No more than 0.1% errors
	http_req_failed: ["rate<0.001"],
	// All checks must pass
	checks: ["rate>0.99"],
};

// ── Standard headers for V1 API requests ─────────────────────────
function apiHeaders(key = API_KEY) {
	return {
		"Content-Type": "application/json",
		...(key ? { Authorization: `Bearer ${key}` } : {}),
	};
}

// ── Helpers ────────────────────────────────────────────────────────
function randomString(len = 12) {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	let out = "";
	for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
	return out;
}

// ── Search query pool (simulates real user queries) ────────────────
const QUERY_POOL = [
	"*",
	"test",
	"documentation",
	"getting started",
	"search",
	"api key",
	"authentication",
	"analytics",
	"dashboard",
	"settings",
	"user",
	"project",
	"index",
	"pagination",
	"filters",
	"sorting",
	"facets",
	"widget",
	"embed",
	"connector",
	"integration",
	"webhook",
	"quota",
	"rate limit",
	"permissions",
];

function randomQuery() {
	return QUERY_POOL[Math.floor(Math.random() * QUERY_POOL.length)];
}

export {
	BASE_URL,
	TYPESENSE,
	API_KEY,
	INDEX_ID,
	INDEX_SLUG,
	THRESHOLDS,
	apiHeaders,
	randomString,
	randomQuery,
};
