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
import { BarChart3Icon, SearchIcon, InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormatter } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { ActivityLog } from "./ActivityLog";
import { EmptyState } from "./EmptyState";
import { FailedQueriesTable } from "./FailedQueriesTable";

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

type AnalyticsTab = "dashboard" | "failed" | "activity" | "top-queries";

interface SearchAnalyticsCardsProps {
	organizationId: string;
	initialTab?: string;
}

export function SearchAnalyticsCards({ organizationId, initialTab }: SearchAnalyticsCardsProps) {
	const t = useTranslations();
	const format = useFormatter();
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const [period, setPeriod] = useState<PeriodKey>("7d");

	// Sync active tab with URL search params so sidebar nav links work.
	const urlTab = searchParams.get("tab") || initialTab || "dashboard";
	const validTabs: AnalyticsTab[] = ["dashboard", "failed", "activity", "top-queries"];
	const [activeTab, setActiveTabState] = useState<AnalyticsTab>(
		validTabs.includes(urlTab as AnalyticsTab) ? (urlTab as AnalyticsTab) : "dashboard",
	);

	const setActiveTab = (tab: AnalyticsTab) => {
		setActiveTabState(tab);
		// Build new URL search params
		const params = new URLSearchParams(searchParams.toString());
		if (tab === "dashboard" || tab === "top-queries") {
			params.delete("tab");
		} else {
			params.set("tab", tab);
		}
		const qs = params.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	};

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
		Array.isArray(analyticsData?.zeroResultQueries) && analyticsData!.zeroResultQueries.length > 0;

	const latencyP50 = analyticsData?.latencyP50 ?? null;
	const latencyP95 = analyticsData?.latencyP95 ?? null;
	const latencyP99 = analyticsData?.latencyP99 ?? null;
	const hasLatencyData = latencyP50 !== null || latencyP95 !== null || latencyP99 !== null;

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

	const planName = planInfo?.planName ?? t("search.analytics.freePlan");
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

	const renderDashboardTab = () => (
		<div className="space-y-6">
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

			{/* Query Performance card */}
			<Card>
				<CardHeader>
					<CardTitle>{t("search.analytics.queryPerformance")}</CardTitle>
				</CardHeader>
				<CardContent>
					{hasLatencyData ? (
						<div className="gap-4 grid grid-cols-3">
							{[
								{ label: t("search.analytics.latencyP50"), value: latencyP50 },
								{ label: t("search.analytics.latencyP95"), value: latencyP95 },
								{ label: t("search.analytics.latencyP99"), value: latencyP99 },
							].map(({ label, value }) => (
								<div key={label} className="gap-1 flex flex-col items-center">
									<span className="text-xs text-muted-foreground">{label}</span>
									<span className="text-2xl font-semibold tabular-nums">
										{value !== null ? value : "—"}
									</span>
									<span className="text-xs text-muted-foreground">ms</span>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">{t("search.analytics.noLatencyData")}</p>
					)}
				</CardContent>
			</Card>

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
									<TableHead className="w-12">{t("search.analytics.rankColumn")}</TableHead>
									<TableHead>{t("search.analytics.queryColumn")}</TableHead>
									<TableHead className="text-right">{t("search.analytics.countColumn")}</TableHead>
									<TableHead className="text-right">
										{t("search.analytics.percentColumn")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{topQueriesData.map(
									(row: { query: string; count: number | string }, index: number) => {
										const count = Number(row.count);
										const percent =
											totalQueryCount > 0 ? ((count / totalQueryCount) * 100).toFixed(1) : "0.0";
										return (
											<TableRow key={row.query}>
												<TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
												<TableCell className="font-mono text-sm">{row.query}</TableCell>
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

			{/* Failed Queries table */}
			<FailedQueriesTable zeroResultQueries={zeroResultQueries} totalSearches={totalSearches} />
		</div>
	);

	const renderFailedTab = () => (
		<div className="space-y-6">
			<FailedQueriesTable zeroResultQueries={zeroResultQueries} totalSearches={totalSearches} />

			{/* Summary stats for failed queries */}
			<Card>
				<CardHeader>
					<CardTitle>{t("search.analytics.failedQueries")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="gap-4 md:grid-cols-3 grid">
						<StatsTile
							title={t("search.analytics.totalFailedQueries")}
							value={
								hasZeroResultData
									? zeroResultQueries.reduce(
											(sum: number, q: { count: number }) => sum + (q.count ?? 0),
											0,
										)
									: 0
							}
							valueFormat="number"
						/>
						<StatsTile
							title={t("search.analytics.zeroResultRate")}
							value={hasZeroResultData ? zeroResultRate : 0}
							valueFormat={hasZeroResultData ? "percentage" : "number"}
						/>
						<StatsTile
							title={t("search.analytics.uniqueFailedQueries")}
							value={zeroResultQueries.length}
							valueFormat="number"
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	const renderActivityTab = () => <ActivityLog organizationId={organizationId} limit={50} />;

	return (
		<div className="space-y-6">
			{/* Period switcher */}
			<div className="flex items-center justify-between">
				<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnalyticsTab)}>
					<TabsList>
						<TabsTrigger value="dashboard">{t("search.analytics.tabDashboard")}</TabsTrigger>
						<TabsTrigger value="failed">{t("search.analytics.tabFailed")}</TabsTrigger>
						<TabsTrigger value="activity">{t("search.analytics.tabActivity")}</TabsTrigger>
					</TabsList>
				</Tabs>

				<Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
					<TabsList>
						<TabsTrigger value="24h">{t("search.analytics.period24h")}</TabsTrigger>
						<TabsTrigger value="7d">{t("search.analytics.period7d")}</TabsTrigger>
						<TabsTrigger value="30d">{t("search.analytics.period30d")}</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

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

			{/* Tab content */}
			{activeTab === "dashboard" && renderDashboardTab()}
			{activeTab === "top-queries" && renderDashboardTab()}
			{activeTab === "failed" && renderFailedTab()}
			{activeTab === "activity" && renderActivityTab()}
		</div>
	);
}
