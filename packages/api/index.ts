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

import { publicSearchApp } from "./modules/search/public-handler";
import { openApiHandler, rpcHandler } from "./orpc/handler";
export { listPurchases } from "./modules/payments/procedures/list-purchases";

export { router } from "./orpc/router";

export const app = new Hono()
	.basePath("/api")
	// Logger middleware
	.use(honoLogger((message, ...rest) => logger.log(message, ...rest)))
	// Public search endpoint (own permissive CORS, mounted before global CORS)
	.route("/", publicSearchApp)
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
		(paymentsConfig as { aiWallet?: { monthlyIncludedByPlan?: Record<string, bigint | number> } })
			.aiWallet?.monthlyIncludedByPlan ?? {};
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
