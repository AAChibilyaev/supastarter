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
	.output(
		z.object({
			totalSearches: z.number(),
			totalSessions: z.number(),
			topQueries: z.array(z.object({ query: z.string(), count: z.number() })),
			zeroResultQueries: z.array(z.object({ query: z.string(), count: z.number() })),
			topClickedProducts: z.array(
				z.object({ productId: z.string(), title: z.string(), clicks: z.number() }),
			),
			ctr: z.number(),
			searchesOverTime: z.array(z.object({ date: z.string(), count: z.number() })),
			ctrTrend: z
				.array(
					z.object({
						date: z.string(),
						searches: z.number(),
						clicks: z.number(),
						ctr: z.number(),
					}),
				)
				.default([]),
			latencyP50: z.number().nullable(),
			latencyP95: z.number().nullable(),
			latencyP99: z.number().nullable(),
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

		// ── CTR trend (searches + clicks per day) ──
		const clicksMap: Record<string, number> = {};
		// Initialise all days in the period with 0
		for (const key of Object.keys(daysMap)) {
			clicksMap[key] = 0;
		}
		for (const e of events) {
			if (e.type === "result_click") {
				const key = e.createdAt.toISOString().slice(0, 10);
				clicksMap[key] = (clicksMap[key] ?? 0) + e.count;
			}
		}

		const ctrTrend = Object.keys(daysMap)
			.sort((a, b) => a.localeCompare(b))
			.map((date) => {
				const searches = daysMap[date] ?? 0;
				const clicks = clicksMap[date] ?? 0;
				const dayCtr = searches > 0 ? clicks / searches : 0;
				return { date, searches, clicks, ctr: dayCtr };
			});

		// ── Latency percentiles (p50/p95/p99) ──
		type LatencyRow = { p50: number | null; p95: number | null; p99: number | null };
		const latencyRows = await db.$queryRaw<LatencyRow[]>`
			SELECT
				percentile_cont(0.5)  WITHIN GROUP (ORDER BY CAST(metadata->>'latencyMs' AS FLOAT)) AS p50,
				percentile_cont(0.95) WITHIN GROUP (ORDER BY CAST(metadata->>'latencyMs' AS FLOAT)) AS p95,
				percentile_cont(0.99) WITHIN GROUP (ORDER BY CAST(metadata->>'latencyMs' AS FLOAT)) AS p99
			FROM search_usage_event
			WHERE organization_id = ${organizationId}
			  AND type = 'search_query'
			  AND created_at >= ${since}
			  AND metadata->>'latencyMs' IS NOT NULL
		`;
		const latency = latencyRows[0] ?? { p50: null, p95: null, p99: null };

		return {
			totalSearches,
			totalSessions,
			topQueries,
			zeroResultQueries,
			topClickedProducts,
			ctr,
			searchesOverTime,
			ctrTrend,
			latencyP50: latency.p50 !== null ? Math.round(latency.p50) : null,
			latencyP95: latency.p95 !== null ? Math.round(latency.p95) : null,
			latencyP99: latency.p99 !== null ? Math.round(latency.p99) : null,
		};
	});
