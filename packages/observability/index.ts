export { createMetricsRegistry } from "./lib/registry";
export { trackSearchLatency } from "./lib/search-middleware";
export { collectIngestQueueDepth } from "./lib/ingest-metrics";
export { collectActiveApiKeys } from "./lib/api-key-metrics";
export { collectErrorRate } from "./lib/error-rate-metrics";
export { metricsHandler } from "./lib/metrics-handler";
export { getMetrics, type PrometheusMetrics } from "./lib/singleton";
export { httpMetricsMiddleware } from "./lib/http-middleware";
export {
	initTracing,
	getTracer,
	withSpan,
	withActiveSpan,
	otelRequestMiddleware,
	tracedHonoMiddleware,
	SpanStatusCode,
} from "./lib/tracing";
export type { Span, Tracer } from "./lib/tracing";
