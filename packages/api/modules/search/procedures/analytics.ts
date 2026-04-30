import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

const DAY_MS = 24 * 60 * 60 * 1000;

export const analytics = protectedProcedure
	.route({
		method: "GET",
		path: "/search/analytics",
		tags: ["Search"],
		summary: "Get search analytics",
		description: "Returns aggregated analytics for a given organization and time period.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			period: z.enum(["last7", "last30"]),
		}),
	)
	.handler(async ({ input: { organizationId, period }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const windowDays = period === "last7" ? 7 : 30;
		const since = new Date(Date.now() - windowDays * DAY_MS);

		// Fetch all usage events within the period
		const events = await db.searchUsageEvent.findMany({
			where: {
				organizationId,
				createdAt: { gte: since },
			},
			orderBy: { createdAt: "asc" },
		});

		// ── Total searches ──
		const totalSearches = events
			.filter((e) => e.type === "search_query")
			.reduce((sum, e) => sum + e.count, 0);

		// ── Total sessions (unique days as proxy) ──
		const uniqueDays = new Set(
			events
				.filter((e) => e.type === "search_query")
				.map((e) => e.createdAt.toISOString().slice(0, 10)),
		);
		const totalSessions = uniqueDays.size > 0 ? uniqueDays.size : 1;

		// ── Top queries ──
		// Since we don't store query text in the event table, aggregate by type
		// Use event counts by date as a proxy for query activity
		const eventCountByType: Record<string, { query: string; count: number }> = {};

		for (const e of events) {
			if (!eventCountByType[e.type]) {
				eventCountByType[e.type] = {
					query: e.type,
					count: 0,
				};
			}
			eventCountByType[e.type].count += e.count;
		}

		const topQueries = Object.values(eventCountByType)
			.filter((e) => e.query !== "zero_results")
			.sort((a, b) => b.count - a.count)
			.slice(0, 10)
			.map((e) => ({ query: e.query, count: e.count }));

		// ── Zero result queries ──
		const zeroResultCount = events
			.filter((e) => e.type === "zero_results")
			.reduce((sum, e) => sum + e.count, 0);

		const zeroResultQueries =
			zeroResultCount > 0 ? [{ query: "zero_results", count: zeroResultCount }] : [];

		// ── Top clicked products ──
		const resultClicks = events
			.filter((e) => e.type === "result_click")
			.reduce((sum, e) => sum + e.count, 0);

		const topClickedProducts =
			resultClicks > 0
				? [
						{
							productId: "all",
							title: "Result clicks",
							clicks: resultClicks,
						},
					]
				: [];

		// ── CTR (click-through rate) ──
		const ctr = totalSearches > 0 ? resultClicks / totalSearches : 0;

		// ── Searches over time ──
		const daysMap: Record<string, number> = {};
		// Initialize all days in the period
		for (let i = 0; i < windowDays; i++) {
			const d = new Date(Date.now() - i * DAY_MS);
			const key = d.toISOString().slice(0, 10);
			daysMap[key] = 0;
		}

		for (const e of events) {
			if (e.type === "search_query") {
				const key = e.createdAt.toISOString().slice(0, 10);
				daysMap[key] = (daysMap[key] ?? 0) + e.count;
			}
		}

		const searchesOverTime = Object.entries(daysMap)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, count]) => ({ date, count }));

		return {
			totalSearches,
			totalSessions,
			topQueries,
			zeroResultQueries,
			topClickedProducts,
			ctr,
			searchesOverTime,
		};
	});
