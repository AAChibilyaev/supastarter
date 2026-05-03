import type { PrometheusMetrics } from "./registry";

/**
 * Track search request latency. Call at the start and end of each search
 * operation to record duration in the histogram and summary metrics.
 *
 * Usage:
 *   const end = trackSearchLatency(metrics, "my-index");
 *   // ... perform search ...
 *   end();
 *
 * Returns a function that records the elapsed time and label values.
 */
export function trackSearchLatency(metrics: PrometheusMetrics, indexSlug: string): () => void {
	const start = performance.now();

	return () => {
		const durationMs = performance.now() - start;

		metrics.searchDurationHistogram.labels(indexSlug).observe(durationMs);

		metrics.searchDurationSummary.labels(indexSlug).observe(durationMs);
	};
}
