import type { MiddlewareHandler } from "hono";

import type { PrometheusMetrics } from "./registry";

/**
 * Hono middleware that measures HTTP request duration and records it in the
 * `aacsearch_http_request_duration_ms` histogram and the
 * `aacsearch_api_requests_total` counter.
 *
 * Usage:
 *   app.use("*", httpMetricsMiddleware(metrics));
 *
 * This should run before (outside of) the traced middleware so the histogram
 * captures the full request lifecycle including tracing overhead.
 */
export function httpMetricsMiddleware(metrics: PrometheusMetrics): MiddlewareHandler {
	return async (c, next) => {
		const start = performance.now();
		const method = c.req.method;
		const path = c.req.routePath ?? c.req.path;

		try {
			await next();
		} finally {
			const durationMs = performance.now() - start;
			const status = c.res.status;

			// Record HTTP request duration histogram
			metrics.httpRequestDuration.labels(method, path).observe(durationMs);

			// Increment total request counter
			metrics.apiRequestsTotal.labels(method, path, String(status)).inc();
		}
	};
}
