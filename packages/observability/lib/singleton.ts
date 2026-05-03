import { createMetricsRegistry } from "./registry";
import type { PrometheusMetrics } from "./registry";

/**
 * Singleton metrics registry shared across the application.
 * Created once at import time and reused by all modules.
 */
let _metrics: PrometheusMetrics | null = null;

export function getMetrics(): PrometheusMetrics {
	if (!_metrics) {
		_metrics = createMetricsRegistry();
	}
	return _metrics;
}

export { type PrometheusMetrics } from "./registry";
