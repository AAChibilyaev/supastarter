import type { Context } from "hono";

import type { PrometheusMetrics } from "./registry";

/**
 * Hono handler that serves Prometheus metrics in text format.
 * Collects fresh values for derived metrics before responding.
 *
 * Usage:
 *   app.get("/metrics", (c) => metricsHandler(c, metrics));
 */
export async function metricsHandler(
	c: Context,
	metrics: PrometheusMetrics,
	collectors?: Array<(m: PrometheusMetrics) => Promise<void>>,
): Promise<Response> {
	// Run all async collectors in parallel before returning
	if (collectors && collectors.length > 0) {
		await Promise.allSettled(collectors.map((fn) => fn(metrics)));
	}

	const body = await metrics.register.metrics();
	const contentType = metrics.register.contentType;

	return c.newResponse(body, 200, {
		"Content-Type": contentType,
	});
}
