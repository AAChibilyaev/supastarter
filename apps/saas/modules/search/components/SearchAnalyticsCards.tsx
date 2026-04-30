"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { StatsTile } from "@shared/components/StatsTile";
import { StatsTileChart } from "@shared/components/StatsTileChart";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, BarChart3Icon, SearchIcon, InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormatter } from "next-intl";
import { useMemo, useState } from "react";

import { EmptyState } from "./EmptyState";

type PeriodKey = "24h" | "7d" | "30d";

const PERIOD_DAYS: Record<PeriodKey, number> = {
	"24h": 1,
	"7d": 7,
	"30d": 30,
};

const PERIOD_API: Record<PeriodKey, "last7" | "last30"> = {
	"24h": "last7",
	"7d": "last7",
	"30d": "last30",
};

const FREE_RETENTION_DAYS = 7;

interface SearchAnalyticsCardsProps {
	organizationId: string;
}

export function SearchAnalyticsCards({ organizationId }: SearchAnalyticsCardsProps) {
	const t = useTranslations();
	const format = useFormatter();
	const [period, setPeriod] = useState<PeriodKey>("7d");

	const days = PERIOD_DAYS[period];

	// ── Data queries ──────────────────────────────────────────────────

	const { data: usageData, isLoading: usageLoading } = useQuery(
		orpc.search.usageSummary.queryOptions({
			input: { organizationId, period: PERIOD_API[period] },
			enabled: !!organizationId,
		}),
	);

	const { data: analyticsData, isLoading: analyticsLoading } = useQuery(
		orpc.search.analytics.queryOptions({
			input: { organizationId, period: PERIOD_API[period] },
			enabled: !!organizationId,
		}),
	);

	const { data: topQueriesData, isLoading: topQueriesLoading } = useQuery(
		orpc.search.topQueries.queryOptions({
			input: { organizationId, days, limit: 10 },
			enabled: !!organizationId,
		}),
	);

	const { data: pipelineData, isLoading: pipelineLoading } = useQuery(
		orpc.search.pipelineStatus.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	const { data: planInfo } = useQuery(
		orpc.entitlements.plan.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	const isLoading = usageLoading || analyticsLoading || topQueriesLoading || pipelineLoading;

	const hasNoData = !usageData && !analyticsData && !topQueriesData;

	// ── KPI derivation ────────────────────────────────────────────────

	const totalSearches = usageData?.searchesUsed ?? analyticsData?.totalSearches ?? 0;

	const documentsIndexed = usageData?.documentsIndexed ?? 0;

	const failedSyncJobs = pipelineData?.failedCount ?? 0;

	const zeroResultQueries = analyticsData?.zeroResultQueries ?? [];
	const zeroResultCount = zeroResultQueries.length > 0 ? zeroResultQueries[0].count : 0;
	const zeroResultRate = totalSearches > 0 ? zeroResultCount / totalSearches : 0;
	const hasZeroResultData =
		Array.isArray(analyticsData?.zeroResultQueries) &&
		analyticsData!.zeroResultQueries.length > 0;

	// ── Chart data ────────────────────────────────────────────────────

	const chartData = useMemo(() => {
		if (!analyticsData?.searchesOverTime) return [];
		return analyticsData.searchesOverTime.map((d: { date: string; count: number }) => ({
			month: d.date,
			searches: d.count,
		}));
	}, [analyticsData]);

	// ── Trend: compare second half vs first half of the period ────────

	const trend = useMemo(() => {
		if (!analyticsData?.searchesOverTime || analyticsData.searchesOverTime.length < 4) {
			return undefined;
		}
		const values = analyticsData.searchesOverTime.map((d: { count: number }) => d.count);
		const mid = Math.floor(values.length / 2);
		const firstHalf = values.slice(0, mid).reduce((a: number, b: number) => a + b, 0);
		const secondHalf = values.slice(mid).reduce((a: number, b: number) => a + b, 0);
		if (firstHalf === 0) return secondHalf > 0 ? 1 : undefined;
		return (secondHalf - firstHalf) / firstHalf;
	}, [analyticsData]);

	// ── Top queries with % of total ───────────────────────────────────

	const totalQueryCount = useMemo(() => {
		if (!topQueriesData) return 0;
		return topQueriesData.reduce(
			(sum: number, q: { count: number | string }) => sum + Number(q.count),
			0,
		);
	}, [topQueriesData]);

	// ── Retention banner ──────────────────────────────────────────────

	const planName = planInfo?.planName ?? "Free";
	const isFreePlan = planName.toLowerCase() === "free";
	const planRetentionDays = isFreePlan ? FREE_RETENTION_DAYS : 30;
	const showRetentionBanner = days > planRetentionDays;

	// ── Loading state ─────────────────────────────────────────────────

	if (isLoading) {
		return <div className="py-8 text-center text-foreground/60">{t("search.loading")}</div>;
	}

	// ── Empty state ───────────────────────────────────────────────────

	if (hasNoData) {
		return (
			<EmptyState
				title={t("search.analytics.noData")}
				description={t("search.analytics.noDataDescription")}
				icon={BarChart3Icon}
			/>
		);
	}

	return (
		<div className="space-y-6">
			{/* Period switcher */}
			<Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
				<TabsList>
					<TabsTrigger value="24h">{t("search.analytics.period24h")}</TabsTrigger>
					<TabsTrigger value="7d">{t("search.analytics.period7d")}</TabsTrigger>
					<TabsTrigger value="30d">{t("search.analytics.period30d")}</TabsTrigger>
				</TabsList>
			</Tabs>

			{/* Retention banner */}
			{showRetentionBanner && (
				<Card className="border-l-4 border-l-foreground/20">
					<CardContent className="gap-3 pt-6 flex items-center">
						<InfoIcon className="size-5 shrink-0 text-foreground/60" />
						<p className="text-sm text-foreground/80">
							{t("search.analytics.retentionBanner", {
								days: planRetentionDays,
								plan: planName,
							})}
						</p>
					</CardContent>
				</Card>
			)}

			{/* KPI row */}
			<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid">
				<StatsTile
					title={t("search.analytics.totalSearches")}
					value={totalSearches}
					valueFormat="number"
					trend={trend}
				/>

				<StatsTile
					title={t("search.analytics.documentsIndexed")}
					value={documentsIndexed}
					valueFormat="number"
				/>

				<StatsTile
					title={t("search.analytics.failedSyncJobs")}
					value={failedSyncJobs}
					valueFormat="number"
				>
					{failedSyncJobs > 0 && (
						<Badge status="error" className="text-xs">
							{failedSyncJobs} {t("search.analytics.failed")}
						</Badge>
					)}
				</StatsTile>

				<StatsTile
					title={t("search.analytics.zeroResultRate")}
					value={hasZeroResultData ? zeroResultRate : 0}
					valueFormat={hasZeroResultData ? "percentage" : "number"}
				>
					{!hasZeroResultData && (
						<Badge status="info" className="text-xs">
							{t("search.analytics.comingSoon")}
						</Badge>
					)}
				</StatsTile>
			</div>

			{/* Searches over time chart */}
			{chartData.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>{t("search.analytics.searchesOverTime")}</CardTitle>
					</CardHeader>
					<CardContent>
						<StatsTileChart
							data={chartData}
							dataKey="searches"
							gradientId="searchGradient"
							chartConfig={{
								searches: {
									label: t("search.analytics.totalSearches"),
									color: "hsl(var(--chart-1))",
								},
							}}
							tooltipFormatter={(value) => format.number(Number(value))}
						/>
					</CardContent>
				</Card>
			)}

			{chartData.length === 0 && (
				<Card>
					<CardHeader>
						<CardTitle>{t("search.analytics.searchesOverTime")}</CardTitle>
					</CardHeader>
					<CardContent>
						<EmptyState
							title={t("search.analytics.noData")}
							description={t("search.analytics.noDataDescription")}
							icon={BarChart3Icon}
						/>
					</CardContent>
				</Card>
			)}

			{/* Top 10 queries table */}
			<Card>
				<CardHeader>
					<CardTitle>{t("search.analytics.topQueries")}</CardTitle>
				</CardHeader>
				<CardContent>
					{topQueriesData && topQueriesData.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">
										{t("search.analytics.rankColumn")}
									</TableHead>
									<TableHead>{t("search.analytics.queryColumn")}</TableHead>
									<TableHead className="text-right">
										{t("search.analytics.countColumn")}
									</TableHead>
									<TableHead className="text-right">
										{t("search.analytics.percentColumn")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{topQueriesData.map(
									(
										row: { query: string; count: number | string },
										index: number,
									) => {
										const count = Number(row.count);
										const percent =
											totalQueryCount > 0
												? ((count / totalQueryCount) * 100).toFixed(1)
												: "0.0";
										return (
											<TableRow key={row.query}>
												<TableCell className="text-xs text-muted-foreground">
													{index + 1}
												</TableCell>
												<TableCell className="font-mono text-sm">
													{row.query}
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{format.number(count)}
												</TableCell>
												<TableCell className="text-xs text-right text-muted-foreground tabular-nums">
													{percent}%
												</TableCell>
											</TableRow>
										);
									},
								)}
							</TableBody>
						</Table>
					) : (
						<EmptyState
							title={t("search.analytics.noData")}
							description={t("search.analytics.noDataDescription")}
							icon={SearchIcon}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
