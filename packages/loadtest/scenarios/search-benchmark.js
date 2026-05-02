/**
 * Search throughput benchmark.
 *
 * Simulates 1 000 requests/second against the V1 search API.
 * Baseline: p99 < 100ms, p95 < 50ms, error rate < 0.1%.
 *
 * Usage:
 *   k6 run scenarios/search-benchmark.js
 *   k6 run -e BASE_URL=http://staging.example.com -e API_KEY=ss_search_... scenarios/search-benchmark.js
 *
 * Requires:
 *   - BASE_URL   (default http://localhost:3010)
 *   - API_KEY    a valid search-scoped API key (ss_search_*)
 *   - INDEX_ID   the target index ID
 *   - INDEX_SLUG the target index slug (optional, falls back to INDEX_ID)
 */

import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";
import { check, sleep } from "k6";
import http from "k6/http";

import { BASE_URL, API_KEY, INDEX_ID, THRESHOLDS, apiHeaders, randomQuery } from "../lib/config.js";

if (!API_KEY) {
	throw new Error("API_KEY is required. Set via -e API_KEY=ss_search_...");
}

if (!INDEX_ID) {
	throw new Error("INDEX_ID is required. Set via -e INDEX_ID=<uuid>");
}

const SEARCH_URL = `${BASE_URL}/v1/indexes/${INDEX_ID}/search`;

export const options = {
	scenarios: {
		search_ramp_up: {
			executor: "ramping-arrival-rate",
			startRate: 100, // start at 100 RPS
			timeUnit: "1s",
			preAllocatedVUs: 100,
			maxVUs: 500,
			stages: [
				{ target: 500, duration: "30s" }, // ramp up to 500 RPS
				{ target: 1000, duration: "30s" }, // continue to 1K RPS
				{ target: 1000, duration: "60s" }, // sustain 1K RPS for 1 min
				{ target: 500, duration: "15s" }, // ramp down
			],
		},
		search_stress: {
			executor: "constant-arrival-rate",
			rate: 50, // 50 RPS constant low-level traffic
			timeUnit: "1s",
			duration: "3m",
			preAllocatedVUs: 20,
			maxVUs: 50,
			startTime: "2m", // starts 2 min in (runs alongside ramp)
		},
	},
	thresholds: {
		...THRESHOLDS,
		// Per-scenario thresholds
		"http_req_duration{scenario:search_ramp_up}": ["p(99)<100"],
		"http_req_duration{scenario:search_stress}": ["p(99)<80"],
	},
};

export default function () {
	const query = randomQuery();

	const payload = JSON.stringify({
		q: query,
		queryBy: "title,description",
		perPage: 20,
		page: 1,
	});

	const res = http.post(SEARCH_URL, payload, {
		headers: apiHeaders(),
	});

	// Verify we get a valid search response
	check(res, {
		"status is 200": (r) => r.status === 200,
		"has hits array": (r) => {
			try {
				const body = JSON.parse(r.body);
				return Array.isArray(body.hits);
			} catch {
				return false;
			}
		},
		"has found count": (r) => {
			try {
				const body = JSON.parse(r.body);
				return typeof body.found === "number";
			} catch {
				return false;
			}
		},
	});

	// Think time: 50-200ms between requests
	sleep(randomIntBetween(0.05, 0.2));
}
