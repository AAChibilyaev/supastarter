/**
 * Widget concurrent sessions benchmark.
 *
 * Simulates 500 concurrent widget sessions — each session models a user on a
 * storefront who loads the widget, opens search (Cmd+K), types queries, and
 * browses results.
 *
 * Usage:
 *   k6 run scenarios/widget-sessions.js
 *   k6 run -e BASE_URL=http://staging.example.com -e API_KEY=ss_search_... -e INDEX_ID=<id> scenarios/widget-sessions.js
 *
 * Requires:
 *   - BASE_URL   (default http://localhost:3010)
 *   - API_KEY    a search-scoped API key (ss_search_*)
 *   - INDEX_ID   the target index ID
 */

import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";
import { check, sleep, group } from "k6";
import http from "k6/http";

import { BASE_URL, API_KEY, INDEX_ID, apiHeaders, randomQuery } from "../lib/config.js";

if (!API_KEY) {
	throw new Error("API_KEY is required. Set via -e API_KEY=ss_search_...");
}

if (!INDEX_ID) {
	throw new Error("INDEX_ID is required. Set via -e INDEX_ID=<uuid>");
}

const SEARCH_URL = `${BASE_URL}/v1/indexes/${INDEX_ID}/search`;
const WIDGET_URL = `${BASE_URL}/api/widget/widget.js`;

// ── Session lifecycle helpers ──────────────────────────────────────
function simulateWidgetSession() {
	// 1. Load the widget script (simulates <script> tag in storefront)
	group("load widget", function () {
		const res = http.get(WIDGET_URL);
		check(res, {
			"widget.js loads (200)": (r) => r.status === 200,
			"widget.js is JavaScript": (r) =>
				(r.headers["Content-Type"] || "").includes("javascript"),
		});
	});

	// 2. Initial page view — no search yet
	sleep(randomIntBetween(1, 3));

	// 3. User presses Cmd+K and starts searching
	const searchesPerSession = randomIntBetween(2, 6);

	for (let i = 0; i < searchesPerSession; i++) {
		group(`search (query ${i + 1}/${searchesPerSession})`, function () {
			const query = randomQuery();
			const perPage = randomIntBetween(10, 50);
			const page = randomIntBetween(1, 3);

			const payload = JSON.stringify({
				q: query,
				queryBy: "title,description",
				perPage,
				page,
			});

			const res = http.post(SEARCH_URL, payload, {
				headers: apiHeaders(),
				tags: { query_type: query === "*" ? "browse" : "search" },
			});

			check(res, {
				"search returns 200": (r) => r.status === 200,
				"search has hits": (r) => {
					try {
						const body = JSON.parse(r.body);
						return Array.isArray(body.hits);
					} catch {
						return false;
					}
				},
				"search completes within 500ms": (r) => r.timings.duration < 500,
			});
		});

		// Think time: user reads results (300ms–3s)
		sleep(randomIntBetween(0.3, 3));
	}

	// 4. User closes the widget
	sleep(randomIntBetween(0.5, 2));
}

export const options = {
	scenarios: {
		widget_concurrent: {
			executor: "ramping-vus",
			startVUs: 50,
			stages: [
				{ target: 200, duration: "30s" }, // ramp up to 200 concurrent sessions
				{ target: 500, duration: "30s" }, // ramp up to 500 concurrent
				{ target: 500, duration: "60s" }, // sustain 500 for 1 min
				{ target: 200, duration: "15s" }, // ramp down
				{ target: 0, duration: "15s" },
			],
			gracefulRampDown: "30s",
		},
	},
	thresholds: {
		http_req_duration: ["p(99)<200", "p(95)<100"],
		// Per-query-type thresholds
		"http_req_duration{query_type:browse}": ["p(99)<150"],
		"http_req_duration{query_type:search}": ["p(99)<300"],
		http_req_failed: ["rate<0.001"],
		checks: ["rate>0.99"],
	},
};

export default function () {
	simulateWidgetSession();
}
