import { auth } from "@repo/auth";
import { applySubscriptionToWallet } from "@repo/billing-wallet";
import { db } from "@repo/database";
import { sendEmail } from "@repo/mail";
import {
	getMetrics,
	httpMetricsMiddleware,
	metricsHandler,
	collectIngestQueueDepth,
	collectActiveApiKeys,
	collectErrorRate,
	getTracer,
	initTracing,
	tracedHonoMiddleware,
} from "@repo/observability";
import type { PrometheusMetrics } from "@repo/observability";
import {
	getPlanIdByProviderPriceId,
	walletWebhookHandler,
	webhookHandler as paymentsWebhookHandler,
} from "@repo/payments";
import { config as paymentsConfig } from "@repo/payments/config";
import { invalidatePlanCache } from "@repo/payments/lib/entitlements";
import { shopifyApp } from "@repo/shopify-connector";
import { getBaseUrl } from "@repo/utils";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { stream } from "hono/streaming";

// Import scrubbed logger to wrap all log output with PII redaction
// This automatically applies scrubValue() to all log payloads
import { logger } from "./lib/scrubbed-logger";
import { assistantPublicApp } from "./modules/assistant/assistant-public";
import { tochkaWebhookApp } from "./modules/billing-wallet/webhooks/tochka";
import { subscribeToFlagChanges } from "./modules/feature-flags/sse-publisher";
import { aiSearchPublicApp } from "./modules/search/ai-search-public";
import { analyticsApp } from "./modules/search/analytics-handler";
import { connectorApp } from "./modules/search/connector-public";
import { demoApp } from "./modules/search/demo-public";
import { eventsApp } from "./modules/search/events-public";
import { publicSearchApp } from "./modules/search/public-handler";
import { scimConfigRouter } from "./modules/search/scim-config";
import { scimRouter } from "./modules/search/scim-public";
import { shareApp } from "./modules/search/share-public";
import { publicSpellCheckApp } from "./modules/search/spell-check-public";
import { openApiHandler, rpcHandler } from "./orpc/handler";
import { v1Router } from "./v1/router";
export { listPurchases } from "./modules/payments/procedures/list-purchases";

export { router } from "./orpc/router";

// ── Metrics registry ──────────────────────────────────────────────

const metrics = getMetrics();

// Async collectors that run on /metrics scrape
const metricsCollectors: Array<(m: PrometheusMetrics) => Promise<void>> = [
	collectIngestQueueDepth,
	collectActiveApiKeys,
	collectErrorRate,
];

// ── OpenTelemetry Tracing ─────────────────────────────────────────

// Initialize OTel SDK. Wired early so all subsequent middleware and
// route handlers are instrumented. Disabled by default; enable with
// AACSEARCH_ENABLE_TRACING=true and configure OTEL_EXPORTER_OTLP_ENDPOINT.
initTracing();

// ── App ───────────────────────────────────────────────────────────

export const app = new Hono()
	.basePath("/api")
	// Logger middleware
	.use(honoLogger((message, ...rest) => logger.log(message, ...rest)))
	// OpenTelemetry tracing middleware (auto-instruments HTTP requests)
	.use(tracedHonoMiddleware(getTracer()))
	// HTTP metrics middleware (tracks request count + duration histograms for all routes)
	.use(httpMetricsMiddleware(metrics))
	// Public search endpoint (own permissive CORS, mounted before global CORS)
	.route("/", publicSearchApp)
	// Public spell-check endpoint (API-key auth, own CORS)
	.route("/", publicSpellCheckApp)
	// Public analytics events endpoint (widget/SDK; same Bearer + own CORS)
	.route("/", eventsApp)
	// Public assistant endpoint for anonymous widget users (permissive CORS, Bearer ss_search_*)
	.route("/", assistantPublicApp)
	// Public AI Search endpoints: image search + AI answer panel for widget
	.route("/", aiSearchPublicApp)
	// Widget JS serving (static file, accessible from any origin for storefronts)
	.get("/widget/widget.js", async (c) => {
		try {
			const fs = await import("node:fs/promises");
			const path = await import("node:path");
			const widgetPath = path.resolve(
				process.cwd(),
				"../../packages/widget/dist/index.global.js",
			);
			const content = await fs.readFile(widgetPath, "utf-8");
			return c.newResponse(content, 200, {
				"Content-Type": "application/javascript",
				"Access-Control-Allow-Origin": "*",
				"Cache-Control": "public, max-age=3600",
			});
		} catch {
			// Dev fallback: try local path
			try {
				const fs = await import("node:fs/promises");
				const path = await import("node:path");
				const widgetPath = path.resolve(
					process.cwd(),
					"packages/widget/dist/index.global.js",
				);
				const content = await fs.readFile(widgetPath, "utf-8");
				return c.newResponse(content, 200, {
					"Content-Type": "application/javascript",
					"Access-Control-Allow-Origin": "*",
					"Cache-Control": "public, max-age=3600",
				});
			} catch {
				return c.text("Widget not built yet. Run: pnpm --filter @repo/widget build", 404);
			}
		}
	})
	// Connector API (CMS modules — permissive CORS, mounted before global CORS)
	.route("/", connectorApp)
	// Shopify OAuth & webhooks (server-side connector)
	.route("/", shopifyApp)
	// Demo sandbox search (no auth, pre-loaded fashion catalog)
	.route("/", demoApp)
	// Analytics events endpoint (permissive CORS for widget/SDK)
	.route("/", analyticsApp)
	// SCIM 2.0 endpoints (identity provisioning — own auth)
	.route("/", scimRouter)
	// SCIM configuration management (org admin session auth)
	.route("/", scimConfigRouter)
	// Share link search (HMAC token, no API key required)
	.route("/", shareApp)
	// Version 1 public REST API (API-key auth, mounted before global CORS for broad access)
	.route("/v1", v1Router)
	// Cors middleware
	.use(
		cors({
			origin: getBaseUrl(process.env.NEXT_PUBLIC_SAAS_URL, 3000),
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["POST", "GET", "OPTIONS"],
			exposeHeaders: ["Content-Length"],
			maxAge: 600,
			credentials: true,
		}),
	)
	// Auth handler
	.on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw))
	// Payments webhook handler (Stripe / Lemonsqueezy / Polar / Creem / DodoPayments)
	.post("/webhooks/payments", async (c) => {
		const cloned = c.req.raw.clone();
		const response = await paymentsWebhookHandler(c.req.raw);
		void syncIncludedCreditsAfterPaymentEvent(cloned).catch((e) =>
			logger.error("syncIncludedCreditsAfterPaymentEvent failed", e),
		);
		void sendUpgradeWelcomeEmails(cloned).catch((e) =>
			logger.error("sendUpgradeWelcomeEmails failed", e),
		);
		return response;
	})
	// Wallet provider webhook (Tochka one-time top-ups)
	.post("/webhooks/payments/tochka", (c) => walletWebhookHandler(c.req.raw))
	// Tochka Acquiring API v1.0 webhook
	.route("/", tochkaWebhookApp)
	// Health check
	.get("/health", (c) => c.text("OK"))
	// Prometheus metrics endpoint — no auth (internal monitoring only)
	.get("/metrics", (c) => metricsHandler(c, metrics, metricsCollectors))
	// Feature Flag SSE endpoint — real-time push on flag changes
	// Clients connect with ?orgId=<orgId>&token=<sessionToken>
	.get("/feature-flags/subscribe", async (c) => {
		const orgId = c.req.query("orgId");
		if (!orgId) {
			return c.json({ error: "orgId query parameter is required" }, 400);
		}

		logger.info("SSE client connected for feature flags", { orgId });

		return stream(c, async (stream) => {
			// Set SSE headers
			c.header("Content-Type", "text/event-stream");
			c.header("Cache-Control", "no-cache");
			c.header("Connection", "keep-alive");
			c.header("X-Accel-Buffering", "no");

			// Send initial connection event
			await stream.write(`event: connected\ndata: ${JSON.stringify({ orgId })}\n\n`);

			// Subscribe to flag change events
			const unsubscribe = subscribeToFlagChanges((event) => {
				// If the event targets a specific org, only push if it matches
				if (event.organizationId && event.organizationId !== orgId) {
					return;
				}

				const payload = JSON.stringify(event);
				stream.write(`event: flag_change\ndata: ${payload}\n\n`).catch(() => {
					// Client disconnected — cleanup handled by onAbort
				});
			});

			// Handle client disconnect
			stream.onAbort(() => {
				logger.info("SSE client disconnected for feature flags", { orgId });
				unsubscribe();
			});

			// Keep the connection alive with periodic pings (every 30s)
			const pingInterval = setInterval(async () => {
				try {
					await stream.write(": ping\n\n");
				} catch {
					clearInterval(pingInterval);
					unsubscribe();
				}
			}, 30_000);

			// Clean up interval on abort
			stream.onAbort(() => {
				clearInterval(pingInterval);
			});

			// Wait indefinitely — the stream stays open
			await new Promise(() => {});
		});
	})
	// oRPC handlers (for RPC and OpenAPI)
	.use("*", async (c, next) => {
		const context = {
			headers: c.req.raw.headers,
		};

		const isRpc = c.req.path.includes("/rpc/");

		const handler = isRpc ? rpcHandler : openApiHandler;

		const prefix = isRpc ? "/api/rpc" : "/api";

		const { matched, response } = await handler.handle(c.req.raw, {
			prefix,
			context,
		});

		if (matched) {
			return c.newResponse(response.body, response);
		}

		await next();
	});

/**
 * Hook invoked after the unified payments webhook handler completes.
 * Resolves the planId of the affected subscription and syncs the AI wallet's
 * `includedMonthlyLimitKopecks` to match. Non-blocking — wraps each step in
 * try/catch and logs.
 */
async function syncIncludedCreditsAfterPaymentEvent(req: Request): Promise<void> {
	let body: string;
	try {
		body = await req.text();
	} catch {
		return;
	}

	let event: { type?: string; data?: { object?: { customer?: string } } };
	try {
		event = JSON.parse(body);
	} catch {
		return;
	}

	if (!event.type?.startsWith("customer.subscription.")) return;

	const customerId = event.data?.object?.customer;
	if (!customerId) return;

	const purchase = await db.purchase.findFirst({
		where: { customerId, type: "SUBSCRIPTION" },
		orderBy: { createdAt: "desc" },
	});
	if (!purchase) return;

	const planId = getPlanIdByProviderPriceId(purchase.priceId);
	if (!planId) return;

	const includedMap =
		(
			paymentsConfig as {
				aiWallet?: { monthlyIncludedByPlan?: Record<string, bigint | number> };
			}
		).aiWallet?.monthlyIncludedByPlan ?? {};
	const rawValue = includedMap[planId];
	const includedKopecks =
		typeof rawValue === "bigint"
			? rawValue
			: rawValue !== undefined
				? BigInt(rawValue)
				: BigInt(0);

	await applySubscriptionToWallet({
		organizationId: purchase.organizationId,
		userId: purchase.userId,
		planId,
		subscriptionId: purchase.subscriptionId ?? "",
		includedKopecks,
	});
}

/**
 * Hook invoked after the unified payments webhook handler completes.
 * Detects `customer.subscription.updated` events where a subscription's price
 * changed (plan upgrade/downgrade) and sends a welcome/confirmation email
 * to the org owners/admins. Non-blocking.
 */
async function sendUpgradeWelcomeEmails(req: Request): Promise<void> {
	let body: string;
	try {
		body = await req.text();
	} catch {
		return;
	}

	let event: {
		type?: string;
		data?: {
			object?: {
				id?: string;
				customer?: string;
				items?: { data?: Array<{ price?: { id?: string } }> };
				previous_attributes?: Record<string, unknown>;
				cancel_at_period_end?: boolean;
				status?: string;
				current_period_end?: number;
			};
		};
	};
	try {
		event = JSON.parse(body);
	} catch {
		return;
	}

	// Only handle subscription updates where the plan/price actually changed
	if (event.type !== "customer.subscription.updated") return;

	const sub = event.data?.object;
	if (!sub?.id || !sub?.customer) return;

	// Skip cancellations and other non-price-change updates
	if (sub.cancel_at_period_end) return;
	if (!sub.previous_attributes) return;

	// Check if the items (price) attribute changed
	const prevAttrs = sub.previous_attributes as Record<string, unknown>;
	if (!prevAttrs.items && !prevAttrs["items.data"]) return;

	// Get the new price ID to determine the plan
	const newPriceId = sub.items?.data?.[0]?.price?.id;
	if (!newPriceId) return;

	const planId = getPlanIdByProviderPriceId(newPriceId);
	if (!planId) return;

	// Look up the purchase to find the org/user
	const purchase = await db.purchase.findFirst({
		where: { customerId: sub.customer as string, type: "SUBSCRIPTION" },
		orderBy: { createdAt: "desc" },
	});
	if (!purchase) return;

	const organizationId = purchase.organizationId;
	if (!organizationId) return;

	// Invalidate plan cache for immediate effect
	invalidatePlanCache(organizationId);

	// Get organization name
	const organization = await db.organization.findUnique({
		where: { id: organizationId },
		select: { name: true },
	});
	const orgName = organization?.name ?? "Your Organization";

	// Get plan display name
	const planDisplayName = planId.charAt(0).toUpperCase() + planId.slice(1);

	// Calculate next billing date
	const periodEnd = sub.current_period_end;
	const nextBillingDate = periodEnd
		? new Date(periodEnd * 1000).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: "N/A";

	// Get SaaS URL for links
	const saasUrl = process.env.NEXT_PUBLIC_SAAS_URL ?? "http://localhost:3000";
	const manageSubscriptionUrl = `${saasUrl}/org/${organizationId}/settings/billing`;
	const dashboardUrl = `${saasUrl}/org/${organizationId}/overview`;

	// Send email to org owners/admins
	try {
		const members = await db.member.findMany({
			where: {
				organizationId,
				role: { in: ["owner", "admin"] },
			},
			select: { userId: true },
		});

		for (const member of members) {
			const user = await db.user.findUnique({
				where: { id: member.userId },
				select: { email: true, locale: true },
			});
			if (!user?.email) continue;

			const locale = (user.locale as string | null | undefined) ?? "en";

			await sendEmail({
				to: user.email,
				locale: locale as "en" | "de" | "es" | "fr" | "ru",
				templateId: "subscriptionUpgrade",
				context: {
					orgName,
					planName: planDisplayName,
					nextBillingDate,
					manageSubscriptionUrl,
					dashboardUrl,
				},
			});

			logger.info("Sent upgrade welcome email", {
				userId: member.userId,
				planId,
				organizationId,
			});
		}
	} catch (e) {
		logger.error("Failed to send upgrade welcome emails", e);
	}
}
