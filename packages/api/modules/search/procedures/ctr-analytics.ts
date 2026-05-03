import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

const DAY_MS = 24 * 60 * 60 * 1000;

export const ctrAnalytics = protectedProcedure
	.route({
		method: "GET",
		path: "/search/ctr-analytics",
		tags: ["Search"],
		summary: "Get per-query and per-index CTR analytics",
		description:
			"Returns click-through rate breakdowns by query, by index, " +
			"and as a daily trend. Uses aggregated SearchUsageEvent data.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			windowDays: z.number().int().min(1).max(365).default(30),
			indexId: z.string().optional(),
		}),
	)
	.output(
		z.object({
			overall: z.object({
				totalSearches: z.number(),
				totalClicks: z.number(),
				ctr: z.number(),
			}),
			byIndex: z.array(
				z.object({
					indexId: z.string().optional(),
					indexName: z.string(),
					searches: z.number(),
					clicks: z.number(),
					ctr: z.number(),
					trend: z.string().optional(),
				}),
			),
			byQuery: z.array(
				z.object({
					query: z.string(),
					searches: z.number(),
					clicks: z.number(),
					ctr: z.number(),
				}),
			),
			trend: z.array(
				z.object({
					date: z.string(),
					searches: z.number(),
					clicks: z.number(),
					ctr: z.number(),
				}),
			),
		}),
	)
	.handler(async ({ input: { organizationId, windowDays, indexId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const since = new Date(Date.now() - windowDays * DAY_MS);

		// ── Overall totals ──
		const idxFilter = indexId ? `AND event.index_id = '${indexId}'` : "";

		type CountRow = { total: bigint };
		const [searchCount] = await db.$queryRawUnsafe<CountRow[]>(
			`SELECT COALESCE(SUM(count), 0) AS total
			 FROM search_usage_event event
			 WHERE event.organization_id = $1
			   AND event.type = 'search_query'
			   AND event.created_at >= $2
			   ${idxFilter}`,
			organizationId,
			since,
		);

		const [clickCount] = await db.$queryRawUnsafe<CountRow[]>(
			`SELECT COALESCE(SUM(count), 0) AS total
			 FROM search_usage_event event
			 WHERE event.organization_id = $1
			   AND event.type = 'result_click'
			   AND event.created_at >= $2
			   ${idxFilter}`,
			organizationId,
			since,
		);

		const totalSearches = Number(searchCount?.total ?? 0);
		const totalClicks = Number(clickCount?.total ?? 0);
		const overallCtr = totalSearches > 0 ? totalClicks / totalSearches : 0;

		// ── CTR by index ──
		type IndexCtrRow = {
			index_id: string;
			index_name: string;
			searches: bigint;
			clicks: bigint;
		};
		const byIndexRaw = await db.$queryRawUnsafe<IndexCtrRow[]>(
			`SELECT
				event.index_id,
				COALESCE(idx.name, 'unknown') AS index_name,
				COALESCE(SUM(CASE WHEN event.type = 'search_query' THEN event.count ELSE 0 END), 0) AS searches,
				COALESCE(SUM(CASE WHEN event.type = 'result_click' THEN event.count ELSE 0 END), 0) AS clicks
			 FROM search_usage_event event
			 LEFT JOIN search_index idx ON idx.id = event.index_id
			 WHERE event.organization_id = $1
			   AND event.created_at >= $2
			   ${idxFilter}
			 GROUP BY event.index_id, idx.name
			 ORDER BY searches DESC`,
			organizationId,
			since,
		);

		const byIndex = byIndexRaw.map((row) => {
			const s = Number(row.searches);
			const c = Number(row.clicks);
			return {
				indexId: row.index_id,
				indexName: row.index_name,
				searches: s,
				clicks: c,
				ctr: s > 0 ? c / s : 0,
			};
		});

		// ── CTR by query ──
		// Parse metadata JSON to extract query text
		type QueryCtrRow = {
			query_text: string;
			searches: bigint;
			clicks: bigint;
		};
		const byQueryRaw = await db.$queryRawUnsafe<QueryCtrRow[]>(
			`SELECT
				COALESCE(event.metadata->>'query', event.metadata->>'q', 'unknown') AS query_text,
				COALESCE(SUM(CASE WHEN event.type = 'search_query' THEN event.count ELSE 0 END), 0) AS searches,
				COALESCE(SUM(CASE WHEN event.type = 'result_click' THEN event.count ELSE 0 END), 0) AS clicks
			 FROM search_usage_event event
			 WHERE event.organization_id = $1
			   AND event.created_at >= $2
			   AND (event.type = 'search_query' OR event.type = 'result_click')
			   ${idxFilter}
			 GROUP BY query_text
			 HAVING COALESCE(SUM(CASE WHEN event.type = 'search_query' THEN event.count ELSE 0 END), 0) > 0
			 ORDER BY searches DESC
			 LIMIT 100`,
			organizationId,
			since,
		);

		const byQuery = byQueryRaw.map((row) => {
			const s = Number(row.searches);
			const c = Number(row.clicks);
			return {
				query: row.query_text,
				searches: s,
				clicks: c,
				ctr: s > 0 ? c / s : 0,
			};
		});

		// ── CTR trend over time ──
		type TrendRow = {
			day: string;
			searches: bigint;
			clicks: bigint;
		};
		const trendRaw = await db.$queryRawUnsafe<TrendRow[]>(
			`SELECT
				event.created_at::date AS day,
				COALESCE(SUM(CASE WHEN event.type = 'search_query' THEN event.count ELSE 0 END), 0) AS searches,
				COALESCE(SUM(CASE WHEN event.type = 'result_click' THEN event.count ELSE 0 END), 0) AS clicks
			 FROM search_usage_event event
			 WHERE event.organization_id = $1
			   AND event.created_at >= $2
			   ${idxFilter}
			 GROUP BY day
			 ORDER BY day ASC`,
			organizationId,
			since,
		);

		// Build complete date range with zeros for missing days
		const dayMap = new Map<string, { searches: number; clicks: number }>();
		for (const row of trendRaw) {
			const dayStr = row.day.slice(0, 10);
			dayMap.set(dayStr, {
				searches: Number(row.searches),
				clicks: Number(row.clicks),
			});
		}

		const trend: Array<{ date: string; searches: number; clicks: number; ctr: number }> = [];
		for (let i = windowDays - 1; i >= 0; i--) {
			const d = new Date(Date.now() - i * DAY_MS);
			const key = d.toISOString().slice(0, 10);
			const data = dayMap.get(key) ?? { searches: 0, clicks: 0 };
			trend.push({
				date: key,
				searches: data.searches,
				clicks: data.clicks,
				ctr: data.searches > 0 ? data.clicks / data.searches : 0,
			});
		}

		return {
			overall: {
				totalSearches,
				totalClicks,
				ctr: overallCtr,
			},
			byIndex,
			byQuery,
			trend,
		};
	});
