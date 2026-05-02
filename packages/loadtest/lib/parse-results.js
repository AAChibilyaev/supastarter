#!/usr/bin/env node
/**
 * Parse k6 summary JSON and compare against baselines.
 *
 * Usage:
 *   k6 run scenarios/search-benchmark.js --summary-export=/tmp/summary.json
 *   node lib/parse-results.js /tmp/summary.json
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = resolve(__dirname, "..", ".baseline.env");

function loadBaselines(path) {
	const baselines = {};
	const content = readFileSync(path, "utf-8");
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const [key, value] = trimmed.split("=");
		if (key && value) baselines[key.trim()] = Number(value);
	}
	return baselines;
}

function plural(n, s) {
	return n === 1 ? s : s + "s";
}

function main() {
	const summaryPath = resolve(process.argv[2] || "/dev/stdin");
	const summary = JSON.parse(readFileSync(summaryPath, "utf-8"));

	const baselines = loadBaselines(BASELINE_PATH);

	const httpMetrics = summary.metrics?.http_req_duration;
	if (!httpMetrics) {
		console.error("No http_req_duration metric found in summary");
		process.exit(1);
	}

	const p99 = httpMetrics.values?.["p(99)"];
	const p95 = httpMetrics.values?.["p(95)"];
	const p90 = httpMetrics.values?.["p(90)"];
	const avg = httpMetrics.values?.avg;
	const max = httpMetrics.values?.max;
	const count = httpMetrics.values?.count;

	const failed = summary.metrics?.http_req_failed?.values?.rate ?? 0;
	const checks = summary.metrics?.checks?.values?.passes ?? 0;
	const totalChecks = summary.metrics?.checks?.values?.passes + (summary.metrics?.checks?.values?.fails ?? 0);

	console.log("\n═══════════════════════════════════════════");
	console.log("  Performance Benchmark Results");
	console.log("═══════════════════════════════════════════\n");

	console.log(`  Requests:    ${count} ${plural(count, "request")}`);
	console.log(`  Checks:      ${checks}/${totalChecks} passed`);
	console.log(`  Error rate:  ${(failed * 100).toFixed(2)}%\n`);

	console.log("  Latencies:");
	console.log(`    avg: ${avg?.toFixed(2)}ms`);
	console.log(`    p90: ${p90?.toFixed(2)}ms`);
	console.log(`    p95: ${p95?.toFixed(2)}ms`);
	console.log(`    p99: ${p99?.toFixed(2)}ms`);
	console.log(`    max: ${max?.toFixed(2)}ms\n`);

	// Compare against baselines
	const MULTIPLIER = 1.2;

	console.log("  Regression Check (baseline × 1.2):");
	for (const [key, baseline] of Object.entries(baselines)) {
		let actual = null;
		if (key.includes("SEARCH_P99") || key.includes("WIDGET_P99")) {
			actual = p99;
		} else if (key.includes("INGEST_P95")) {
			actual = p95;
		}

		if (actual === null || actual === undefined) {
			console.log(`    ⚪ ${key}: skipped (no matching metric)`);
			continue;
		}

		const threshold = baseline * MULTIPLIER;
		const pass = actual < threshold;

		if (pass) {
			console.log(`    ✅ ${key}: ${actual.toFixed(1)}ms < ${threshold.toFixed(1)}ms (baseline: ${baseline}ms)`);
		} else {
			console.log(`    ❌ ${key}: ${actual.toFixed(1)}ms ≥ ${threshold.toFixed(1)}ms (baseline: ${baseline}ms)`);
		}
	}

	console.log("\n═══════════════════════════════════════════\n");

	// Exit code
	const hasFailure = Object.entries(baselines).some(([key, baseline]) => {
		let actual = null;
		if (key.includes("SEARCH_P99") || key.includes("WIDGET_P99")) actual = p99;
		if (key.includes("INGEST_P95")) actual = p95;
		return actual !== null && actual >= baseline * MULTIPLIER;
	});

	if (hasFailure) {
		console.error("❌ Performance regression detected!");
		process.exit(1);
	}
}

main();
