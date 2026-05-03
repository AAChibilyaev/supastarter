import { getBillingAnalyticsRaw } from "@repo/database";
import { getPlanPriceByProviderPriceId } from "@repo/payments";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

export interface BillingAnalytics {
	currentMrr: number;
	activeSubscriptions: number;
	churnRateLastMonth: number;
	revenueByMonth: Array<{
		month: string;
		revenue: number;
		newSubscriptions: number;
		cancellations: number;
	}>;
	subscriptionsByPlan: Array<{
		planId: string;
		count: number;
		mrr: number;
	}>;
}

function getMonthKey(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Compute the MRR contribution for a given subscription priceId.
 * Yearly prices are converted to monthly by dividing by 12.
 */
function computeMrr(priceId: string): number {
	const resolved = getPlanPriceByProviderPriceId(priceId);

	if (!resolved?.price || resolved.price.type !== "subscription") {
		return 0;
	}

	const amount = resolved.price.amount;
	const interval = resolved.price.interval;

	if (interval === "month") {
		return amount;
	}

	// Convert yearly to monthly
	return amount / 12;
}

export const billingAnalytics = adminProcedure
	.route({
		method: "GET",
		path: "/payments/billing-analytics",
		tags: ["Payments"],
		summary: "Get billing analytics",
		description:
			"Returns MRR, churn rate, revenue chart data, and subscription breakdown for admin dashboard.",
	})
	.input(z.object({}).optional())
	.handler(async () => {
		const raw = await getBillingAnalyticsRaw();

		// Active subscriptions: status is "active", null, or "trialing"
		const activePurchases = raw.purchases.filter(
			(p) => p.status === "active" || p.status === null || p.status === "trialing",
		);

		const activeSubscriptions = activePurchases.length;

		// Compute current MRR
		const currentMrr = activePurchases.reduce((sum, p) => sum + computeMrr(p.priceId), 0);

		// Track revenue and subscription events by month
		const monthMap = new Map<
			string,
			{ revenue: number; newSubscriptions: number; cancellations: number }
		>();

		for (const purchase of raw.purchases) {
			const month = getMonthKey(purchase.createdAt);
			const existing = monthMap.get(month) ?? {
				revenue: 0,
				newSubscriptions: 0,
				cancellations: 0,
			};

			existing.newSubscriptions += 1;
			existing.revenue += computeMrr(purchase.priceId);

			monthMap.set(month, existing);
		}

		// Process cancellation events from payment provider
		for (const event of raw.cancellationEvents) {
			const payload =
				typeof event.rawPayload === "object" && event.rawPayload !== null
					? (event.rawPayload as Record<string, unknown>)
					: {};

			const isCancellation =
				event.eventType === "customer.subscription.deleted" ||
				(payload.data &&
					typeof payload.data === "object" &&
					(payload.data as Record<string, unknown>).status === "canceled");

			if (isCancellation) {
				const month = getMonthKey(event.createdAt);
				const existing = monthMap.get(month) ?? {
					revenue: 0,
					newSubscriptions: 0,
					cancellations: 0,
				};

				existing.cancellations += 1;
				monthMap.set(month, existing);
			}
		}

		// Build sorted revenue by month
		const revenueByMonth = Array.from(monthMap.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([month, data]) => ({
				month,
				revenue: Math.round(data.revenue * 100) / 100,
				newSubscriptions: data.newSubscriptions,
				cancellations: data.cancellations,
			}));

		// Compute churn rate for last month
		let churnRateLastMonth = 0;

		if (revenueByMonth.length >= 2) {
			const lastMonth = revenueByMonth[revenueByMonth.length - 1];

			if (lastMonth.cancellations > 0) {
				// Churn rate = cancellations in last month / total active subs at end of prev month
				// Approximation: use current active subscriptions as denominator
				if (activeSubscriptions + lastMonth.cancellations > 0) {
					churnRateLastMonth =
						(lastMonth.cancellations / (activeSubscriptions + lastMonth.cancellations)) * 100;
				}
			}
		}

		// Compute subscriptions by plan
		const planCountMap = new Map<string, { count: number; mrr: number }>();

		for (const purchase of activePurchases) {
			const resolved = getPlanPriceByProviderPriceId(purchase.priceId);
			const planId = resolved?.planId ?? "unknown";
			const existing = planCountMap.get(planId) ?? {
				count: 0,
				mrr: 0,
			};

			existing.count += 1;
			existing.mrr += computeMrr(purchase.priceId);
			planCountMap.set(planId, existing);
		}

		const subscriptionsByPlan = Array.from(planCountMap.entries())
			.map(([planId, data]) => ({
				planId,
				count: data.count,
				mrr: Math.round(data.mrr * 100) / 100,
			}))
			.sort((a, b) => b.mrr - a.mrr);

		return {
			currentMrr: Math.round(currentMrr * 100) / 100,
			activeSubscriptions,
			churnRateLastMonth: Math.round(churnRateLastMonth * 100) / 100,
			revenueByMonth,
			subscriptionsByPlan,
		} satisfies BillingAnalytics;
	});
