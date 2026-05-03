/**
 * `aacsearch monitor` — live search metrics dashboard
 *
 * Shows QPS, latency, error rate, and index health in a
 * terminal-based auto-refreshing dashboard.
 */

import { Command } from "commander";

import { ApiClient } from "../lib/client.js";
import { loadConfig } from "../lib/config.js";
import { formatError } from "../lib/formatter.js";

interface Metrics {
	qps?: number;
	averageLatencyMs?: number;
	p99LatencyMs?: number;
	errorRate?: number;
	totalQueries?: number;
	indexCount?: number;
	documentCount?: number;
	period?: string;
}

export const monitorCommand = new Command("monitor")
	.description("Live search metrics dashboard")
	.option(
		"-i, --interval <seconds>",
		"Refresh interval in seconds (default: 5)",
		"5",
	)
	.option("-c, --collection <slug>", "Filter metrics to a specific collection")
	.action(
		async (options: { interval?: string; collection?: string }) => {
			const config = loadConfig();
			const client = new ApiClient(config);
			const interval = Math.max(
				parseInt(options.interval ?? "5", 10) || 5,
				2,
			);

			try {
				// Quick auth check
				const projects = await client.get<Array<{ id: string }>>("/v1/projects");
				const project = projects?.[0];
				if (!project?.id) {
					console.error(
						"Error: Could not find project. Is your API key valid?",
					);
					process.exit(1);
				}

				// Resolve collection if specified
				let indexId: string | undefined;
				if (options.collection) {
					const indexes = await client.get<
						Array<{ id: string; slug: string; displayName: string }>
					>(`/v1/projects/${project.id}/indexes`);
					const found = indexes.find(
						(idx) =>
							idx.slug === options.collection ||
							idx.displayName === options.collection,
					);
					if (!found) {
						console.error(
							`Error: Collection "${options.collection}" not found.`,
						);
						process.exit(1);
					}
					indexId = found.id;
				}

				console.log("AACsearch Monitor — Ctrl+C to exit");
				console.log("");

				// eslint-disable-next-line no-constant-condition
				while (true) {
					try {
						await renderDashboard(client, project.id, indexId, interval);
					} catch (error) {
						// Don't crash on a single refresh failure
						process.stdout.write(`\n⚠ Refresh error: ${formatError(error)}\n`);
					}

					// Wait for interval
					await new Promise((resolve) => setTimeout(resolve, interval * 1000));
				}
			} catch (error) {
				console.error(formatError(error));
				process.exit(1);
			}
		},
	);

async function renderDashboard(
	client: ApiClient,
	projectId: string,
	indexId: string | undefined,
	_refreshInterval: number,
): Promise<void> {
	// Clear screen and move cursor to top
	process.stdout.write("\u001b[2J\u001b[H");

	const now = new Date().toLocaleTimeString();
	process.stdout.write(`AACsearch Monitor — ${now}\n`);
	process.stdout.write(`${"─".repeat(50)}\n\n`);

	// Fetch metrics
	let metrics: Metrics;
	try {
		const path = indexId
			? `/v1/projects/${projectId}/metrics?indexId=${indexId}`
			: `/v1/projects/${projectId}/metrics`;
		metrics = await client.get<Metrics>(path);
	} catch {
		// Fallback: try analytics endpoint
		metrics = await client.get<Metrics>(
			`/v1/projects/${projectId}/analytics/summary`,
		);
	}

	// Fetch indexes for health status
	const indexes = await client.get<
		Array<{
			slug: string;
			displayName: string;
			documentsCount?: number;
			status?: string;
		}>
	>(`/v1/projects/${projectId}/indexes`);

	// Dashboard layout
	process.stdout.write("  ┌─ Search Performance ─────────────────────────┐\n");
	process.stdout.write(
		`  │ QPS:          ${pad(String(metrics.qps ?? "—"), 8)}                    │\n`,
	);
	process.stdout.write(
		`  │ Avg Latency:  ${pad(formatMs(metrics.averageLatencyMs), 8)}              │\n`,
	);
	process.stdout.write(
		`  │ P99 Latency:  ${pad(formatMs(metrics.p99LatencyMs), 8)}              │\n`,
	);
	process.stdout.write(
		`  │ Error Rate:   ${pad(formatPct(metrics.errorRate), 8)}              │\n`,
	);
	process.stdout.write(
		`  │ Total Queries:${pad(formatNum(metrics.totalQueries), 8)}               │\n`,
	);
	process.stdout.write("  └───────────────────────────────────────────────┘\n\n");

	process.stdout.write("  ┌─ Index Overview ─────────────────────────────┐\n");
	for (const idx of indexes.slice(0, 5)) {
		const docs = idx.documentsCount ?? 0;
		const docsLabel = docs >= 1_000_000
			? `${(docs / 1_000_000).toFixed(1)}M`
			: docs >= 1_000
				? `${(docs / 1_000).toFixed(1)}K`
				: String(docs);
		const status = idx.status ?? "active";
		const statusIcon = status === "active" ? "✓" : "⚠";
		process.stdout.write(
			`  │ ${statusIcon} ${pad(idx.slug, 22)} ${pad(docsLabel, 8)} docs  │\n`,
		);
	}
	if (indexes.length > 5) {
		process.stdout.write(`  │   ... and ${indexes.length - 5} more indexes              │\n`);
	}
	process.stdout.write("  └───────────────────────────────────────────────┘\n\n");

	// Footer
	process.stdout.write(`Press Ctrl+C to exit. Refreshing every ${_refreshInterval}s.\n`);
}

// ── Formatting helpers ─────────────────────────────────────────────────────

function pad(val: string, width: number): string {
	return val.padStart(width);
}

function formatMs(ms: number | undefined): string {
	if (ms === undefined || ms === null) return "—";
	return ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(1)}ms`;
}

function formatPct(rate: number | undefined): string {
	if (rate === undefined || rate === null) return "—";
	return `${(rate * 100).toFixed(2)}%`;
}

function formatNum(n: number | undefined): string {
	if (n === undefined || n === null) return "—";
	return n.toLocaleString();
}
