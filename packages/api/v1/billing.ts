/**
 * V1 Billing API — self-serve billing endpoints for customers.
 *
 * Uses session-based auth (Better Auth), unlike the API-key auth used
 * by other v1 endpoints. This is because billing operations like cancel
 * and change-plan need user-level authorization, not API key scopes.
 *
 * Endpoints:
 *   GET    /v1/billing/plans                             — list available plans with pricing
 *   GET    /v1/billing/subscription                      — current subscription details
 *   POST   /v1/billing/subscription/cancel               — cancel subscription
 *   POST   /v1/billing/subscription/pause                — pause subscription
 *   POST   /v1/billing/subscription/resume               — resume subscription
 *   POST   /v1/billing/subscription/change               — upgrade/downgrade plan
 *   GET    /v1/billing/invoices                          — list invoices with pagination
 *   GET    /v1/billing/invoices/:id                      — get single invoice
 */

import { auth } from "@repo/auth";
import {
	getOrganizationMembership,
	getPurchaseById,
	getPurchasesByOrganizationId,
	getPurchasesByUserId,
	updatePurchase,
} from "@repo/database";
import { logger } from "@repo/logs";
import {
	cancelSubscription as cancelSubscriptionFn,
	createUpgradeSession,
	getPlanIdByProviderPriceId,
	getPlanPriceByProviderPriceId,
	listCustomerInvoices,
	pauseSubscription as pauseSubscriptionFn,
	resumeSubscription as resumeSubscriptionFn,
} from "@repo/payments";
import { config as paymentsConfig } from "@repo/payments/config";
import { Hono } from "hono";
import { z } from "zod";

// ─── Auth middleware ────────────────────────────────────────────────────

async function requireSession(c: { req: { raw: Request } }) {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session) {
		return null;
	}

	return session;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatPlanForResponse(
	planId: string,
	plan: Record<string, unknown>,
): Record<string, unknown> {
	const prices = (plan as { prices?: Array<Record<string, unknown>> }).prices ?? [];
	return {
		id: planId,
		...plan,
		prices: prices.map((p: Record<string, unknown>) => ({
			priceId: p.priceId,
			amount: p.amount,
			currency: p.currency,
			type: p.type,
			interval: p.interval ?? null,
			seatBased: p.seatBased ?? false,
			trialPeriodDays: p.trialPeriodDays ?? null,
		})),
	};
}

async function getCustomerId(session: { user: { id: string } }, organizationId?: string) {
	const purchases = organizationId
		? await getPurchasesByOrganizationId(organizationId)
		: await getPurchasesByUserId(session.user.id);

	const sub = purchases.find((p) => p.type === "SUBSCRIPTION" && p.subscriptionId);
	return sub?.customerId ?? null;
}

// ─── Router ─────────────────────────────────────────────────────────────

export const billingApp = new Hono()
	// ── GET /billing/plans ───────────────────────────────────────────
	.get("/plans", async (c) => {
		const session = await requireSession(c);
		if (!session) {
			return c.json({ error: "unauthorized", message: "Authentication required" }, 401);
		}

		const plans = (paymentsConfig as unknown as Record<
			string,
			Record<string, unknown>
		>).plans as Record<string, Record<string, unknown>> | null;
		if (!plans) {
			return c.json({ error: "not_found", message: "No plans configured" }, 404);
		}

		const formatted = Object.entries(plans).map(([id, plan]) =>
			formatPlanForResponse(id, plan),
		);

		return c.json(formatted);
	})

	// ── GET /billing/subscription ────────────────────────────────────
	.get("/subscription", async (c) => {
		const session = await requireSession(c);
		if (!session) {
			return c.json({ error: "unauthorized", message: "Authentication required" }, 401);
		}

		const organizationId = c.req.query("organizationId") ?? undefined;

		const purchases = organizationId
			? await getPurchasesByOrganizationId(organizationId)
			: await getPurchasesByUserId(session.user.id);

		const subscription = purchases.find((p) => p.type === "SUBSCRIPTION");

		if (!subscription) {
			return c.json({ error: "not_found", message: "No active subscription found" }, 404);
		}

		// Verify org membership if organizationId provided
		if (organizationId) {
			const membership = await getOrganizationMembership(organizationId, session.user.id);
			if (!membership) {
				return c.json({ error: "forbidden", message: "Not a member of this organization" }, 403);
			}
		}

		const planId = getPlanIdByProviderPriceId(subscription.priceId);
		const planPrice = getPlanPriceByProviderPriceId(subscription.priceId)?.price ?? null;

		return c.json({
			id: subscription.id,
			planId,
			status: subscription.status,
			priceId: subscription.priceId,
			customerId: subscription.customerId,
			subscriptionId: subscription.subscriptionId,
			createdAt: subscription.createdAt,
			price: planPrice
				? {
						amount: planPrice.amount,
						currency: planPrice.currency,
						interval: (planPrice as unknown as Record<string, unknown>).interval ?? null,
						seatBased: (planPrice as unknown as Record<string, unknown>).seatBased ?? false,
					}
				: null,
		});
	})

	// ── POST /billing/subscription/cancel ────────────────────────────
	.post("/subscription/cancel", async (c) => {
		const session = await requireSession(c);
		if (!session) {
			return c.json({ error: "unauthorized", message: "Authentication required" }, 401);
		}

		let body: { purchaseId: string; mode?: "immediate" | "cancel_at_period_end" };
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json", message: "Request body must be valid JSON" }, 400);
		}

		const schema = z.object({
			purchaseId: z.string().min(1),
			mode: z.enum(["immediate", "cancel_at_period_end"]).default("cancel_at_period_end"),
		});

		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{ error: "invalid_input", message: "Validation failed", details: parsed.error.issues },
				400,
			);
		}

		const { purchaseId, mode } = parsed.data;
		const purchase = await getPurchaseById(purchaseId);

		if (!purchase) {
			return c.json({ error: "not_found", message: "Purchase not found" }, 404);
		}

		if (purchase.organizationId) {
			const membership = await getOrganizationMembership(purchase.organizationId, session.user.id);
			if (membership?.role !== "owner") {
				return c.json({ error: "forbidden", message: "Only organization owners can cancel" }, 403);
			}
		} else if (purchase.userId && purchase.userId !== session.user.id) {
			return c.json({ error: "forbidden", message: "Not your purchase" }, 403);
		}

		if (!purchase.subscriptionId) {
			return c.json({ error: "bad_request", message: "Purchase has no subscription" }, 400);
		}

		try {
			await cancelSubscriptionFn(purchase.subscriptionId, { mode });

			if (mode === "cancel_at_period_end") {
				await updatePurchase({ id: purchase.id, status: "canceling" });
			}

			return c.json({ success: true, mode });
		} catch (e) {
			logger.error("Could not cancel subscription", e);
			return c.json({ error: "internal_error", message: "Failed to cancel subscription" }, 500);
		}
	})

	// ── POST /billing/subscription/pause ─────────────────────────────
	.post("/subscription/pause", async (c) => {
		const session = await requireSession(c);
		if (!session) {
			return c.json({ error: "unauthorized", message: "Authentication required" }, 401);
		}

		let body: { purchaseId: string; behavior?: "keep_as_draft" | "mark_uncollectible" | "void" };
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json", message: "Request body must be valid JSON" }, 400);
		}

		const schema = z.object({
			purchaseId: z.string().min(1),
			behavior: z.enum(["keep_as_draft", "mark_uncollectible", "void"]).default("keep_as_draft"),
		});

		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{ error: "invalid_input", message: "Validation failed", details: parsed.error.issues },
				400,
			);
		}

		const { purchaseId, behavior } = parsed.data;
		const purchase = await getPurchaseById(purchaseId);

		if (!purchase) {
			return c.json({ error: "not_found", message: "Purchase not found" }, 404);
		}

		if (purchase.organizationId) {
			const membership = await getOrganizationMembership(purchase.organizationId, session.user.id);
			if (membership?.role !== "owner") {
				return c.json({ error: "forbidden", message: "Only organization owners can pause" }, 403);
			}
		} else if (purchase.userId && purchase.userId !== session.user.id) {
			return c.json({ error: "forbidden", message: "Not your purchase" }, 403);
		}

		if (!purchase.subscriptionId) {
			return c.json({ error: "bad_request", message: "Purchase has no subscription" }, 400);
		}

		try {
			await pauseSubscriptionFn(purchase.subscriptionId, { behavior });
			await updatePurchase({ id: purchase.id, status: "paused" });

			return c.json({ success: true, behavior });
		} catch (e) {
			logger.error("Could not pause subscription", e);
			return c.json({ error: "internal_error", message: "Failed to pause subscription" }, 500);
		}
	})

	// ── POST /billing/subscription/resume ────────────────────────────
	.post("/subscription/resume", async (c) => {
		const session = await requireSession(c);
		if (!session) {
			return c.json({ error: "unauthorized", message: "Authentication required" }, 401);
		}

		let body: { purchaseId: string };
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json", message: "Request body must be valid JSON" }, 400);
		}

		const schema = z.object({
			purchaseId: z.string().min(1),
		});

		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{ error: "invalid_input", message: "Validation failed", details: parsed.error.issues },
				400,
			);
		}

		const { purchaseId } = parsed.data;
		const purchase = await getPurchaseById(purchaseId);

		if (!purchase) {
			return c.json({ error: "not_found", message: "Purchase not found" }, 404);
		}

		if (purchase.organizationId) {
			const membership = await getOrganizationMembership(purchase.organizationId, session.user.id);
			if (membership?.role !== "owner") {
				return c.json({ error: "forbidden", message: "Only organization owners can resume" }, 403);
			}
		} else if (purchase.userId && purchase.userId !== session.user.id) {
			return c.json({ error: "forbidden", message: "Not your purchase" }, 403);
		}

		if (!purchase.subscriptionId) {
			return c.json({ error: "bad_request", message: "Purchase has no subscription" }, 400);
		}

		try {
			await resumeSubscriptionFn(purchase.subscriptionId);
			await updatePurchase({ id: purchase.id, status: "active" });

			return c.json({ success: true });
		} catch (e) {
			logger.error("Could not resume subscription", e);
			return c.json({ error: "internal_error", message: "Failed to resume subscription" }, 500);
		}
	})

	// ── POST /billing/subscription/change ───────────────────────────
	.post("/subscription/change", async (c) => {
		const session = await requireSession(c);
		if (!session) {
			return c.json({ error: "unauthorized", message: "Authentication required" }, 401);
		}

		let body: {
			purchaseId: string;
			newPlanId: string;
			returnUrl?: string;
		};
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json", message: "Request body must be valid JSON" }, 400);
		}

		const schema = z.object({
			purchaseId: z.string().min(1),
			newPlanId: z.string().min(1),
			returnUrl: z.string().url().optional(),
		});

		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{ error: "invalid_input", message: "Validation failed", details: parsed.error.issues },
				400,
			);
		}

		const { purchaseId, newPlanId, returnUrl } = parsed.data;
		const purchase = await getPurchaseById(purchaseId);

		if (!purchase) {
			return c.json({ error: "not_found", message: "Purchase not found" }, 404);
		}

		if (purchase.organizationId) {
			const membership = await getOrganizationMembership(purchase.organizationId, session.user.id);
			if (membership?.role !== "owner") {
				return c.json({ error: "forbidden", message: "Only organization owners can change plan" }, 403);
			}
		} else if (purchase.userId && purchase.userId !== session.user.id) {
			return c.json({ error: "forbidden", message: "Not your purchase" }, 403);
		}

		if (!purchase.subscriptionId) {
			return c.json({ error: "bad_request", message: "Purchase has no subscription" }, 400);
		}

		// Look up the new price ID for the requested plan
		const plans = (paymentsConfig as unknown as Record<string, Record<string, unknown>>).plans as Record<
			string,
			{ prices?: Array<{ priceId?: string }> }
		>;
		const targetPlan = plans[newPlanId];
		if (!targetPlan?.prices?.length) {
			return c.json({ error: "invalid_input", message: "Plan not found or has no pricing" }, 400);
		}

		const newPriceId = targetPlan.prices[0].priceId;
		if (!newPriceId) {
			return c.json({ error: "invalid_input", message: "Plan has no price ID" }, 400);
		}

		try {
			const result = await createUpgradeSession({
				subscriptionId: purchase.subscriptionId,
				newPriceId,
				customerId: purchase.customerId ?? "",
				returnUrl: returnUrl ?? `${c.req.url.replace("/change", "")}`,
			});

			return c.json(result);
		} catch (e) {
			logger.error("Could not change subscription", e);
			return c.json({ error: "internal_error", message: "Failed to change subscription plan" }, 500);
		}
	})

	// ── GET /billing/invoices ────────────────────────────────────────
	.get("/invoices", async (c) => {
		const session = await requireSession(c);
		if (!session) {
			return c.json({ error: "unauthorized", message: "Authentication required" }, 401);
		}

		const organizationId = c.req.query("organizationId") ?? undefined;
		const limitStr = c.req.query("limit") ?? "10";
		const startingAfter = c.req.query("startingAfter") ?? undefined;

		const limit = Math.min(Math.max(parseInt(limitStr, 10) || 10, 1), 100);

		const customerId = await getCustomerId(session, organizationId);

		if (!customerId) {
			return c.json({ invoices: [], hasMore: false });
		}

		try {
			const result = await listCustomerInvoices({
				customerId,
				limit,
				startingAfter,
			});

			return c.json(result);
		} catch (e) {
			logger.error("Failed to list invoices", e);
			return c.json({ error: "internal_error", message: "Failed to list invoices" }, 500);
		}
	})

	// ── GET /billing/invoices/:id ────────────────────────────────────
	.get("/invoices/:id", async (c) => {
		const session = await requireSession(c);
		if (!session) {
			return c.json({ error: "unauthorized", message: "Authentication required" }, 401);
		}

		const invoiceId = c.req.param("id");
		const organizationId = c.req.query("organizationId") ?? undefined;

		const customerId = await getCustomerId(session, organizationId);

		if (!customerId) {
			return c.json({ error: "not_found", message: "Invoice not found" }, 404);
		}

		try {
			const result = await listCustomerInvoices({
				customerId,
				limit: 100,
			});

			const invoice = result.invoices.find((inv) => inv.id === invoiceId);
			if (!invoice) {
				return c.json({ error: "not_found", message: "Invoice not found" }, 404);
			}

			return c.json(invoice);
		} catch (e) {
			logger.error("Failed to fetch invoice", e);
			return c.json({ error: "internal_error", message: "Failed to fetch invoice" }, 500);
		}
	});
