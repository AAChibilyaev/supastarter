/**
 * OpenTelemetry tracing setup for AACsearch.
 *
 * This module provides a lightweight tracer factory that instruments
 * the application with OpenTelemetry spans. By default it uses a
 * no-op tracer (no export). To enable real tracing:
 *
 *   1. Set env AACSEARCH_ENABLE_TRACING=true
 *   2. Configure OTEL_EXPORTER_OTLP_ENDPOINT (default: http://localhost:4318)
 *      and OTEL_SERVICE_NAME (default: aacsearch-api)
 *
 * Manual tracing API is always available regardless of exporter setup.
 */

import {
	trace,
	context,
	SpanStatusCode,
	diag,
	DiagConsoleLogger,
	DiagLogLevel,
} from "@opentelemetry/api";
import type { Span, Tracer, Attributes, SpanOptions } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { logger } from "@repo/logs";

/**
 * Initialize the OpenTelemetry SDK. Conditionally enabled via
 * AACSEARCH_ENABLE_TRACING=true env var.
 *
 * Must be called before any instrumented code runs (typically at
 * the top of the Hono app entry point).
 *
 * Environment variables:
 *   AACSEARCH_ENABLE_TRACING  — set to "true" to enable
 *   OTEL_EXPORTER_OTLP_ENDPOINT — OTLP HTTP endpoint (default: http://localhost:4318)
 *   OTEL_SERVICE_NAME         — service identifier (default: aacsearch-api)
 */
export function initTracing(): void {
	if (!process.env.AACSEARCH_ENABLE_TRACING) {
		logger.info("OpenTelemetry tracing disabled (set AACSEARCH_ENABLE_TRACING=true to enable)");
		return;
	}

	logger.info("Initializing OpenTelemetry SDK...");
	try {
		diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

		// Dynamic imports so the tracing feature doesn't bloat the non-tracing path
		const { NodeSDK } = require("@opentelemetry/sdk-node") as {
			NodeSDK: new (config: Record<string, unknown>) => {
				start(): void;
				shutdown(): Promise<void>;
			};
		};
		const { getNodeAutoInstrumentations } =
			require("@opentelemetry/auto-instrumentations-node") as {
				getNodeAutoInstrumentations: () => Record<string, unknown>[];
			};
		const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http") as {
			OTLPTraceExporter: new (config: Record<string, unknown>) => unknown;
		};

		const sdk = new NodeSDK({
			resource: new Resource({
				[SemanticResourceAttributes.SERVICE_NAME]:
					process.env.OTEL_SERVICE_NAME ?? "aacsearch-api",
			}),
			traceExporter: new OTLPTraceExporter({
				url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
			}),
			instrumentations: [getNodeAutoInstrumentations()],
		});

		sdk.start();

		// Graceful shutdown on process exit
		process.on("SIGTERM", () => {
			sdk.shutdown()
				.then(() => logger.info("OpenTelemetry SDK shut down"))
				.catch((e: unknown) => logger.error("OpenTelemetry shutdown error", e));
		});

		logger.info("OpenTelemetry SDK initialized successfully");
	} catch (error) {
		logger.error("Failed to initialize OpenTelemetry SDK", { error });
	}
}

const SERVICE_NAME = "aacsearch-api";

let _tracer: Tracer | null = null;

/**
 * Get the application tracer. Always available — either backed
 * by a real SDK or a no-op tracer.
 */
export function getTracer(): Tracer {
	if (!_tracer) {
		_tracer = trace.getTracer(SERVICE_NAME);
	}
	return _tracer;
}

/**
 * Run an async function inside an OTel span.
 *
 * Usage:
 *   const result = await withSpan(tracer, "search.query", async (span) => {
 *     span.setAttribute("index_slug", slug);
 *     return doSearch();
 *   });
 */
export async function withSpan<T>(
	tracer: Tracer,
	name: string,
	fn: (span: Span) => Promise<T>,
	options?: SpanOptions,
): Promise<T> {
	const span = tracer.startSpan(name, options);

	try {
		const result = await fn(span);
		span.setStatus({ code: SpanStatusCode.OK });
		return result;
	} catch (error) {
		span.recordException(error as Error);
		span.setStatus({
			code: SpanStatusCode.ERROR,
			message: error instanceof Error ? error.message : String(error),
		});
		throw error;
	} finally {
		span.end();
	}
}

/**
 * Run an async function inside an OTel span using
 * the active context (child span of current parent).
 */
export async function withActiveSpan<T>(
	tracer: Tracer,
	name: string,
	fn: (span: Span) => Promise<T>,
	options?: SpanOptions,
): Promise<T> {
	const span = tracer.startSpan(name, options);

	return context.with(trace.setSpan(context.active(), span), async () => {
		try {
			const result = await fn(span);
			span.setStatus({ code: SpanStatusCode.OK });
			return result;
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: error instanceof Error ? error.message : String(error),
			});
			throw error;
		} finally {
			span.end();
		}
	});
}

/**
 * Create a Hono-style middleware that creates a span for each request.
 *
 * Usage in app:
 *   app.use("*", otelRequestMiddleware(getTracer()));
 */
export function otelRequestMiddleware(tracer: Tracer) {
	return async (
		c: {
			req: {
				method: string;
				url: string;
				routePath?: string;
				header: (name: string) => string | undefined;
			};
			res?: { status: number };
		},
		next: () => Promise<void>,
	) => {
		const method = c.req.method;
		const path = c.req.routePath ?? c.req.url;

		const span = tracer.startSpan(`HTTP ${method}`, {
			attributes: {
				"http.method": method,
				"http.url": c.req.url,
				"http.target": path,
			},
		});

		return context.with(trace.setSpan(context.active(), span), async () => {
			try {
				await next();
				const status = c.res?.status ?? 200;
				span.setAttribute("http.status_code", status);
				span.setStatus({ code: SpanStatusCode.OK });
			} catch (error) {
				span.setAttribute("http.status_code", 500);
				span.recordException(error as Error);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : String(error),
				});
				throw error;
			} finally {
				span.end();
			}
		});
	};
}

/** Alias for otelRequestMiddleware. Used in the main Hono app entry point. */
export const tracedHonoMiddleware = otelRequestMiddleware;

export { SpanStatusCode } from "@opentelemetry/api";
export type { Span, Tracer, Attributes, SpanOptions };
