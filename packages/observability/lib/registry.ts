import client from "prom-client";

export interface PrometheusMetrics {
	register: client.Registry;
	ingestQueueDepth: client.Gauge<string>;
	searchDurationHistogram: client.Histogram<string>;
	searchDurationSummary: client.Summary<string>;
	errorRate: client.Gauge<string>;
	activeApiKeys: client.Gauge<string>;
	apiRequestsTotal: client.Counter<string>;
	httpRequestDuration: client.Histogram<string>;
}

export function createMetricsRegistry(): PrometheusMetrics {
	const register = new client.Registry();

	client.collectDefaultMetrics({
		register,
		prefix: "aacsearch_",
	});

	// Ingest queue depth: number of unprocessed items in SearchIngestBuffer
	const ingestQueueDepth = new client.Gauge({
		name: "aacsearch_ingest_queue_depth",
		help: "Number of unprocessed items in the search ingest buffer",
		registers: [register],
	});

	// Search request duration histogram (milliseconds)
	const searchDurationHistogram = new client.Histogram({
		name: "aacsearch_search_duration_ms",
		help: "Histogram of search request durations in milliseconds",
		buckets: [5, 10, 25, 50, 100, 200, 500, 1000, 2000, 5000],
		labelNames: ["index_slug"],
		registers: [register],
	});

	// Search request duration summary (for p99 calculation)
	const searchDurationSummary = new client.Summary({
		name: "aacsearch_search_duration_summary_ms",
		help: "Summary of search request durations in milliseconds",
		percentiles: [0.5, 0.9, 0.95, 0.99, 0.999],
		labelNames: ["index_slug"],
		registers: [register],
	});

	// Error rate: ratio of failed vs total ingest jobs (0.0 - 1.0)
	const errorRate = new client.Gauge({
		name: "aacsearch_ingest_error_rate",
		help: "Ratio of failed ingest jobs to total ingest jobs",
		registers: [register],
	});

	// Active API keys count
	const activeApiKeys = new client.Gauge({
		name: "aacsearch_active_api_keys",
		help: "Number of active (non-revoked, non-expired) search API keys",
		registers: [register],
	});

	// Total API requests
	const apiRequestsTotal = new client.Counter({
		name: "aacsearch_api_requests_total",
		help: "Total number of API requests",
		labelNames: ["method", "path", "status"],
		registers: [register],
	});

	// HTTP request duration histogram
	const httpRequestDuration = new client.Histogram({
		name: "aacsearch_http_request_duration_ms",
		help: "Duration of HTTP requests in milliseconds",
		buckets: [10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
		labelNames: ["method", "path"],
		registers: [register],
	});

	return {
		register,
		ingestQueueDepth,
		searchDurationHistogram,
		searchDurationSummary,
		errorRate,
		activeApiKeys,
		apiRequestsTotal,
		httpRequestDuration,
	};
}
