import { auth } from "@repo/auth";
import { applySubscriptionToWallet } from "@repo/billing-wallet";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import {
	getPlanIdByProviderPriceId,
	walletWebhookHandler,
	webhookHandler as paymentsWebhookHandler,
} from "@repo/payments";
import { config as paymentsConfig } from "@repo/payments/config";
import { getBaseUrl } from "@repo/utils";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

import { tochkaWebhookApp } from "./modules/billing-wallet/webhooks/tochka";
import { analyticsApp } from "./modules/search/analytics-handler";
import { connectorApp } from "./modules/search/connector-public";
import { eventsApp } from "./modules/search/events-public";
import { publicSearchApp } from "./modules/search/public-handler";
import { publicSpellCheckApp } from "./modules/search/spell-check-public";
import { scimRouter } from "./modules/search/scim-public";
import { openApiHandler, rpcHandler } from "./orpc/handler";
import { v1Router } from "./v1/router";
export { listPurchases } from "./modules/payments/procedures/list-purchases";

export { router } from "./orpc/router";

export const app = new Hono()
	.basePath("/api")
	// Logger middleware
	.use(honoLogger((message, ...rest) => logger.log(message, ...rest)))
	// Public search endpoint (own permissive CORS, mounted before global CORS)
	.route("/", publicSearchApp)
	// Public spell-check endpoint (API-key auth, own CORS)
	.route("/", publicSpellCheckApp)
	// Public analytics events endpoint (widget/SDK; same Bearer + own CORS)
	.route("/", eventsApp)
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
	// Analytics events endpoint (permissive CORS for widget/SDK)
	.route("/", analyticsApp)
	// SCIM 2.0 endpoints (identity provisioning — own auth)
	.route("/", scimRouter)
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
		return response;
	})
	// Wallet provider webhook (Tochka one-time top-ups)
	.post("/webhooks/payments/tochka", (c) => walletWebhookHandler(c.req.raw))
	// Tochka Acquiring API v1.0 webhook
	.route("/", tochkaWebhookApp)
	// Health check
	.get("/health", (c) => c.text("OK"))
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
