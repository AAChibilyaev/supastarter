/**
 * Ingest throughput benchmark.
 *
 * Simulates high-volume document ingestion targeting ~100K docs/min
 * (≈1 667 docs/sec) via the V1 batch documents API.
 *
 * Usage:
 *   k6 run scenarios/ingest-benchmark.js
 *   k6 run -e BASE_URL=http://staging.example.com -e API_KEY=ss_connector_... scenarios/ingest-benchmark.js
 *
 * Requires:
 *   - BASE_URL   (default http://localhost:3010)
 *   - API_KEY    a connector-scoped API key (ss_connector_*) with write access
 *   - INDEX_ID   the target index ID
 */

import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";
import { check, sleep } from "k6";
import http from "k6/http";

import { BASE_URL, API_KEY, INDEX_ID, apiHeaders, randomString } from "../lib/config.js";

if (!API_KEY) {
	throw new Error("API_KEY is required. Set via -e API_KEY=ss_connector_...");
}

if (!INDEX_ID) {
	throw new Error("INDEX_ID is required. Set via -e INDEX_ID=<uuid>");
}

const BATCH_URL = `${BASE_URL}/v1/indexes/${INDEX_ID}/documents:batch`;

// ── Document generators ──────────────────────────────────────────
function generateDocument() {
	const id = randomString(16);
	return {
		id,
		title: `Load test document ${id}`,
		description: `Auto-generated document for ingest benchmark. Generated at ${Date.now()}. Content includes various searchable text fields for testing.`,
		category: ["electronics", "books", "clothing", "home", "sports"][
			Math.floor(Math.random() * 5)
		],
		price: Math.round(Math.random() * 100000) / 100,
		inStock: Math.random() > 0.2,
		tags: Array.from({ length: 3 }, () => randomString(6)),
		createdAt: new Date().toISOString(),
	};
}

function generateBatch(size = 100) {
	return Array.from({ length: size }, () => generateDocument());
}

export const options = {
	scenarios: {
		ingest_capacity: {
			executor: "ramping-arrival-rate",
			// 100 docs/batch × rates below:
			//   rate=5   → 500  docs/sec (30K  /min)
			//   rate=10  → 1000 docs/sec (60K  /min)
			//   rate=17  → 1700 docs/sec (102K /min) ≈ target
			//   rate=25  → 2500 docs/sec (150K /min) — stress limit
			startRate: 2, // 2 batches/sec → 200 docs/sec
			timeUnit: "1s",
			preAllocatedVUs: 10,
			maxVUs: 50,
			stages: [
				{ target: 5, duration: "30s" }, //  500 docs/sec
				{ target: 10, duration: "30s" }, // 1000 docs/sec
				{ target: 17, duration: "60s" }, // 1700 docs/sec ≈ target
				{ target: 17, duration: "60s" }, // sustain 100K/min
				{ target: 10, duration: "30s" }, // ramp down
			],
		},
	},
	thresholds: {
		http_req_duration: ["p(99)<5000"], // ingest is slower; 5s ceiling
		"http_req_duration{scenario:ingest_capacity}": ["p(95)<2000"],
		http_req_failed: ["rate<0.01"], // allow 1% for ingest (larger payloads)
		checks: ["rate>0.95"],
	},
};

export default function () {
	const batch = generateBatch(100);
	const payload = JSON.stringify(batch);

	const res = http.post(BATCH_URL, payload, {
		headers: apiHeaders(),
	});

	check(res, {
		"status is 200 or 201": (r) => r.status === 200 || r.status === 201,
		"response is valid JSON": (r) => {
			try {
				JSON.parse(r.body);
				return true;
			} catch {
				return false;
			}
		},
	});

	sleep(randomIntBetween(0.05, 0.1));
}
