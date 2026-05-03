/**
 * V1 Analytics endpoints.
 *
 *   GET /v1/projects/:projectId/analytics  — aggregated search analytics
 *   GET /v1/projects/:projectId/usage      — raw usage data
 */

import { aggregateSearchUsage, db } from "@repo/database";
import { Hono } from "hono";

import { requireScope } from "./auth";

const DAY_MS = 24 * 60 * 60 * 1000;

export const analyticsApp = new Hono()
	// ── Aggregated analytics ───────────────────────────────────────
	.get("/projects/:projectId/analytics", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const projectId = c.req.param("projectId");
		if (projectId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Project not found" }, 404);
		}

		const period = (c.req.query("period") ?? "last7") as "last7" | "last30";
		if (period !== "last7" && period !== "last30") {
			return c.json(
				{ error: "invalid_input", message: "period must be 'last7' or 'last30'" },
				400,
			);
		}

		const windowDays = period === "last7" ? 7 : 30;
		const since = new Date(Date.now() - windowDays * DAY_MS);

		const events = await db.searchUsageEvent.findMany({
			where: {
				organizationId: verified.organizationId,
				createdAt: { gte: since },
			},
			orderBy: { createdAt: "asc" },
		});

		const totalSearches = events
			.filter((e) => e.type === "search_query")
			.reduce((sum, e) => sum + e.count, 0);

		const uniqueDays = new Set(
			events
				.filter((e) => e.type === "search_query")
				.map((e) => e.createdAt.toISOString().slice(0, 10)),
		);
		const totalSessions = uniqueDays.size > 0 ? uniqueDays.size : 1;

		// Top queries
		const eventCountByType: Record<string, number> = {};
		for (const e of events) {
			eventCountByType[e.type] = (eventCountByType[e.type] ?? 0) + e.count;
		}

		const topQueries = Object.entries(eventCountByType)
			.filter(([key]) => key !== "zero_results")
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([query, count]) => ({ query, count }));

		const zeroResultCount = events
			.filter((e) => e.type === "zero_results")
			.reduce((sum, e) => sum + e.count, 0);
		const zeroResultQueries =
			zeroResultCount > 0 ? [{ query: "zero_results", count: zeroResultCount }] : [];

		const resultClicks = events
			.filter((e) => e.type === "result_click")
			.reduce((sum, e) => sum + e.count, 0);
		const topClickedProducts =
			resultClicks > 0
				? [{ productId: "all", title: "Result clicks", clicks: resultClicks }]
				: [];

		const ctr = totalSearches > 0 ? resultClicks / totalSearches : 0;

		// Searches over time
		const daysMap: Record<string, number> = {};
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

		return c.json({
			totalSearches,
			totalSessions,
			topQueries,
			zeroResultQueries,
			topClickedProducts,
			ctr,
			searchesOverTime,
		});
	})

	// ── Raw usage data ─────────────────────────────────────────────
	.get("/projects/:projectId/usage", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const projectId = c.req.param("projectId");
		if (projectId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Project not found" }, 404);
		}

		const windowDays = Math.min(
			Math.max(parseInt(c.req.query("windowDays") ?? "30", 10) || 30, 1),
			365,
		);
		const since = new Date(Date.now() - windowDays * DAY_MS);

		const rows = await aggregateSearchUsage(verified.organizationId, since);

		return c.json({ since: since.toISOString(), rows });
	})

	// ── Failed Queries Analytics ─────────────────────────────────────
	.get("/projects/:projectId/failed-queries", async (c) => {
		const gated = await requireScope("admin")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const projectId = c.req.param("projectId");
		if (projectId !== verified.organizationId) {
			return c.json({ error: "not_found", message: "Project not found" }, 404);
		}

		const period = (c.req.query("period") ?? "last7") as "last7" | "last30";
		if (period !== "last7" && period !== "last30") {
			return c.json(
				{ error: "invalid_input", message: "period must be 'last7' or 'last30'" },
				400,
			);
		}

		const indexId = c.req.query("indexId") ?? null;
		const windowDays = period === "last7" ? 7 : 30;
		const since = new Date(Date.now() - windowDays * DAY_MS);

		// Query zero_result events with metadata extraction
		type FailedQueryRow = {
			query: string;
			count: bigint;
			lastSeen: Date;
			trend: number;
		};
		const rows = await db.$queryRaw<FailedQueryRow[]>`
			SELECT
				COALESCE(metadata->>'q', '(empty)') AS query,
				SUM(count) AS count,
				MAX(created_at) AS last_seen,
				SUM(
					CASE WHEN created_at >= NOW() - INTERVAL '3 days'
					THEN count ELSE 0 END
				) - SUM(
					CASE
						WHEN created_at >= NOW() - INTERVAL '6 days'
						AND created_at < NOW() - INTERVAL '3 days'
						THEN count ELSE 0
					END
				) AS trend
			FROM search_usage_event
			WHERE organization_id = ${verified.organizationId}::text
			  AND type = 'zero_results'
			  AND created_at >= ${since}
			  ${indexId ? `AND index_id = ${indexId}::text` : ""}
			GROUP BY metadata->>'q'
			ORDER BY count DESC
			LIMIT 100
		`;

		const failedQueries = rows.map((r) => ({
			query: r.query as string,
			count: Number(r.count),
			lastSeen: (r.lastSeen as Date).toISOString(),
			trend: Number(r.trend) as number,
		}));

		// Total counts summary
		type TotalRow = { total: bigint };
		const [totalResult] = await db.$queryRaw<TotalRow[]>`
			SELECT SUM(count) AS total
			FROM search_usage_event
			WHERE organization_id = ${verified.organizationId}::text
			  AND type = 'zero_results'
			  AND created_at >= ${since}
			  ${indexId ? `AND index_id = ${indexId}::text` : ""}
		`;

		// Trend over time (day-by-day)
		type DayRow = { date: string; count: bigint };
		const dayRows = await db.$queryRaw<DayRow[]>`
			SELECT
				created_at::date::text AS date,
				SUM(count) AS count
			FROM search_usage_event
			WHERE organization_id = ${verified.organizationId}::text
			  AND type = 'zero_results'
			  AND created_at >= ${since}
			  ${indexId ? `AND index_id = ${indexId}::text` : ""}
			GROUP BY created_at::date
			ORDER BY date ASC
		`;

		const zeroResultsOverTime = dayRows.map((r) => ({
			date: r.date as string,
			count: Number(r.count),
		}));

		return c.json({
			failedQueries,
			total: Number(totalResult?.total ?? 0),
			zeroResultsOverTime,
			period,
		});
	});
