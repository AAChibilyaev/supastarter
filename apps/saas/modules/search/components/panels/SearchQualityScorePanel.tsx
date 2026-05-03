"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { StatsTile } from "@shared/components/StatsTile";
import { StatsTileChart } from "@shared/components/StatsTileChart";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	AlertTriangleIcon,
	ArrowRightIcon,
	CheckCircleIcon,
	InfoIcon,
	SearchIcon,
	TrendingDownIcon,
	TrendingUpIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormatter } from "next-intl";
import { useMemo, useState } from "react";

import { EmptyState } from "../cards/EmptyState";

// ── Types ────────────────────────────────────────────────────────────────────

type PeriodKey = "7d" | "30d";
const PERIOD_DAYS: Record<PeriodKey, number> = { "7d": 7, "30d": 30 };
const PERIOD_API: Record<PeriodKey, "last7" | "last30"> = { "7d": "last7", "30d": "last30" };

interface QualityFactors {
	zeroResultScore: number; // 0-100
	ctrScore: number; // 0-100
	latencyScore: number; // 0-100
}

type HealthRating = "excellent" | "good" | "fair" | "poor";

const HEALTH_THRESHOLDS: Record<HealthRating, { min: number; color: string; label: string }> = {
	excellent: { min: 80, color: "success", label: "search.qualityScore.excellent" },
	good: { min: 60, color: "success", label: "search.qualityScore.good" },
	fair: { min: 40, color: "warning", label: "search.qualityScore.fair" },
	poor: { min: 0, color: "error", label: "search.qualityScore.poor" },
};

function getHealthRating(score: number): HealthRating {
	if (score >= 80) return "excellent";
	if (score >= 60) return "good";
	if (score >= 40) return "fair";
	return "poor";
}

// ── Quality Score Calculation ─────────────────────────────────────────────────

function calculateQualityScore(
	totalSearches: number,
	zeroResultCount: number,
	ctrValue: number,
	latencyP99: number | null,
): QualityFactors & { composite: number; rating: HealthRating } {
	// Zero-results score: 0% = 100, 50%+ = 0
	const zeroResultRate = totalSearches > 0 ? zeroResultCount / totalSearches : 0;
	const zeroResultScore = Math.max(0, Math.round((1 - zeroResultRate * 2) * 100));

	// CTR score: 20%+ = 100, 0% = 0
	const ctrScore = Math.min(100, Math.max(0, Math.round((ctrValue * 5) * 100)));

	// Latency score: <100ms p99 = 100, 1000ms+ p99 = 0
	const latencyScore =
		latencyP99 !== null
			? Math.max(0, Math.min(100, Math.round((1 - Math.max(0, latencyP99 - 100) / 900) * 100)))
			: 50; // neutral if no data

	const composite = Math.round(zeroResultScore * 0.35 + ctrScore * 0.35 + latencyScore * 0.3);
	const rating = getHealthRating(composite);

	return { composite, rating, zeroResultScore, ctrScore, latencyScore };
}

// ── Improvement Suggestions ───────────────────────────────────────────────────

interface Suggestion {
	label: string;
	description: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
}

function getSuggestions(
	scores: QualityFactors,
	basePath: string,
	t: (key: string) => string,
): Suggestion[] {
	const suggestions: Suggestion[] = [];

	if (scores.zeroResultScore < 60) {
		suggestions.push({
			label: t("search.qualityScore.suggest.synonyms"),
			description: t("search.qualityScore.suggest.synonymsDesc"),
			href: `${basePath}/relevance?tab=synonyms`,
			icon: SearchIcon,
		});
	}

	if (scores.ctrScore < 60) {
		suggestions.push({
			label: t("search.qualityScore.suggest.curations"),
			description: t("search.qualityScore.suggest.curationsDesc"),
			href: `${basePath}/relevance?tab=curations`,
			icon: TrendingUpIcon,
		});
	}

	if (scores.latencyScore < 50) {
		suggestions.push({
			label: t("search.qualityScore.suggest.ranking"),
			description: t("search.qualityScore.suggest.rankingDesc"),
			href: `${basePath}/relevance?tab=ranking`,
			icon: InfoIcon,
		});
	}

	return suggestions;
}

// ── Main Component ────────────────────────────────────────────────────────────

interface SearchQualityScorePanelProps {
	organizationId: string;
}

export function SearchQualityScorePanel({ organizationId }: SearchQualityScorePanelProps) {
	const t = useTranslations();
	const format = useFormatter();
	const [period, setPeriod] = useState<PeriodKey>("30d");

	const days = PERIOD_DAYS[period];
	const periodApi = PERIOD_API[period];

	// ── Data queries ──────────────────────────────────────────────────────────

	const { data: analyticsData, isLoading: analyticsLoading } = useQuery(
		orpc.search.analytics.queryOptions({
			input: { organizationId, period: periodApi },
			enabled: !!organizationId,
		}),
	);

	const { data: ctrData, isLoading: ctrLoading } = useQuery(
		orpc.search.ctrAnalytics.queryOptions({
			input: { organizationId, windowDays: days },
			enabled: !!organizationId,
		}),
	);

	const { data: topQueriesData } = useQuery(
		orpc.search.topQueries.queryOptions({
			input: { organizationId, days, limit: 5 },
			enabled: !!organizationId,
		}),
	);

	const isLoading = analyticsLoading || ctrLoading;

	// ── Derived values ────────────────────────────────────────────────────────

	const totalSearches = analyticsData?.totalSearches ?? 0;
	const zeroResultCount = Array.isArray(analyticsData?.zeroResultQueries)
		? analyticsData!.zeroResultQueries.reduce(
				(sum: number, q: { count: number }) => sum + (q.count ?? 0),
				0,
			)
		: 0;
	const ctrValue = ctrData?.overall.ctr ?? analyticsData?.ctr ?? 0;
	const latencyP99 = analyticsData?.latencyP99 ?? null;

	const scores = useMemo(
		() => calculateQualityScore(totalSearches, zeroResultCount, ctrValue, latencyP99),
		[totalSearches, zeroResultCount, ctrValue, latencyP99],
	);

	const zeroResultRate = totalSearches > 0 ? zeroResultCount / totalSearches : 0;

	// ── CTR trend ─────────────────────────────────────────────────────────────

	const ctrTrend = useMemo(() => {
		if (!ctrData?.trend || ctrData.trend.length < 4) return undefined;
		const mid = Math.floor(ctrData.trend.length / 2);
		const firstHalf = ctrData.trend.slice(0, mid).reduce((s, d) => s + d.ctr, 0);
		const secondHalf = ctrData.trend.slice(mid).reduce((s, d) => s + d.ctr, 0);
		if (firstHalf === 0) return undefined;
		return (secondHalf - firstHalf) / firstHalf;
	}, [ctrData]);

	const chartData = useMemo(() => {
		if (!ctrData?.trend) return [];
		return ctrData.trend.map((d: { date: string; ctr: number }) => ({
			month: d.date,
			ctr: d.ctr,
		}));
	}, [ctrData]);

	const healthConfig = HEALTH_THRESHOLDS[scores.rating];
	const suggestions = useMemo(
		() => getSuggestions(scores, `/${organizationId}`, t),
		[scores, organizationId, t],
	);

	// ── Loading state ─────────────────────────────────────────────────────────

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("search.qualityScore.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="py-8 text-center text-sm text-muted-foreground">
						{t("search.loading")}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!totalSearches && !ctrData?.overall.totalSearches) {
		return (
			<Card>
				<CardContent className="pt-6">
					<EmptyState
						title={t("search.qualityScore.noData")}
						description={t("search.qualityScore.noDataDescription")}
						icon={SearchIcon}
					/>
				</CardContent>
			</Card>
		);
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="space-y-6">
			{/* Period selector */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold">{t("search.qualityScore.title")}</h3>
					<p className="text-sm text-muted-foreground">
						{t("search.qualityScore.subtitle", { days })}
					</p>
				</div>
				<Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
					<TabsList>
						<TabsTrigger value="7d">{t("search.qualityScore.period7d")}</TabsTrigger>
						<TabsTrigger value="30d">{t("search.qualityScore.period30d")}</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Composite Score card */}
			<Card className="overflow-hidden">
				<div
					className={`h-2 ${
						scores.rating === "excellent"
							? "bg-green-500"
							: scores.rating === "good"
								? "bg-blue-500"
								: scores.rating === "fair"
									? "bg-amber-500"
									: "bg-red-500"
					}`}
				/>
				<CardContent className="gap-6 pt-6 sm:flex-row sm:items-center flex flex-col">
					<div className="flex shrink-0 flex-col items-center">
						<div
							className={`flex size-20 items-center justify-center rounded-full text-3xl font-bold ${
								scores.rating === "excellent" || scores.rating === "good"
									? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
									: scores.rating === "fair"
										? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
										: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
							}`}
						>
							{scores.composite}
						</div>
						<Badge status={healthConfig.color as "success" | "warning" | "error"}>
							{t(healthConfig.label)}
						</Badge>
					</div>
					<div className="min-w-0 flex-1 space-y-1">
						<p className="text-sm font-medium">
							{t("search.qualityScore.healthBreakdown")}
						</p>
						<div className="gap-4 flex flex-wrap">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<CheckCircleIcon className="size-4 text-green-500" />
								<span>
									{t("search.qualityScore.factorZeroResults")}: {scores.zeroResultScore}/100
								</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<TrendingUpIcon className="size-4 text-blue-500" />
								<span>
									{t("search.qualityScore.factorCTR")}: {scores.ctrScore}/100
								</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<InfoIcon className="size-4 text-purple-500" />
								<span>
									{t("search.qualityScore.factorLatency")}: {scores.latencyScore}/100
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* KPI Tiles row */}
			<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid grid-cols-2">
				<StatsTile
					title={t("search.qualityScore.totalSearches")}
					value={totalSearches}
					valueFormat="number"
					trend={ctrTrend}
				/>
				<StatsTile
					title={t("search.qualityScore.zeroResultRate")}
					value={zeroResultRate}
					valueFormat="percentage"
				/>
				<StatsTile
					title={t("search.qualityScore.ctr")}
					value={ctrValue}
					valueFormat="percentage"
					trend={ctrTrend}
				/>
				<StatsTile
					title={t("search.qualityScore.latencyP99")}
					value={latencyP99 ?? 0}
					valueFormat="number"
				>
					<span className="text-xs text-muted-foreground">ms</span>
				</StatsTile>
			</div>

			{/* CTR Trend chart */}
			{chartData.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("search.qualityScore.ctrTrend")}</CardTitle>
					</CardHeader>
					<CardContent>
						<StatsTileChart
							data={chartData}
							dataKey="ctr"
							gradientId="ctrTrendGradient"
							chartConfig={{
								ctr: {
									label: t("search.qualityScore.ctr"),
									color: "hsl(var(--chart-2))",
								},
							}}
							tooltipFormatter={(value) => format.number(Number(value), { style: "percent" })}
						/>
					</CardContent>
				</Card>
			)}

			{/* Index-level CTR breakdown */}
			{ctrData?.byIndex && ctrData.byIndex.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("search.qualityScore.indexBreakdown")}
						</CardTitle>
						<CardDescription>{t("search.qualityScore.indexBreakdownDesc")}</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="gap-4 grid sm:grid-cols-2 lg:grid-cols-3">
							{ctrData.byIndex.map((idx) => (
								<div
									key={idx.indexName}
									className="rounded-lg border p-4 space-y-2"
								>
									<p className="text-sm font-medium truncate">{idx.indexName}</p>
									<div className="flex items-center justify-between text-sm text-muted-foreground">
										<span>{t("search.qualityScore.searches")}</span>
										<span className="tabular-nums">{format.number(idx.searches)}</span>
									</div>
									<div className="flex items-center justify-between text-sm text-muted-foreground">
										<span>{t("search.qualityScore.clicks")}</span>
										<span className="tabular-nums">{format.number(idx.clicks)}</span>
									</div>
									<div className="flex items-center justify-between text-sm font-medium">
										<span>{t("search.qualityScore.ctr")}</span>
										<span className="tabular-nums">
											{format.number(idx.ctr, { style: "percent" })}
										</span>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Improvement Suggestions */}
			{suggestions.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<AlertTriangleIcon className="size-4 text-amber-500" />
							{t("search.qualityScore.suggestions")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="gap-3 sm:grid-cols-2 lg:grid-cols-3 grid">
							{suggestions.map((suggestion) => {
								const SuggestionIcon = suggestion.icon;
								return (
									<Button
										key={suggestion.label}
										variant="outline"
										className="gap-3 py-4 px-4 h-auto justify-start text-left"
										asChild
									>
										<a href={suggestion.href}>
											<SuggestionIcon className="size-5 shrink-0 text-primary" />
											<div className="min-w-0">
												<div className="text-sm font-medium">{suggestion.label}</div>
												<div className="text-xs truncate text-muted-foreground">
													{suggestion.description}
												</div>
											</div>
											<ArrowRightIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
										</a>
									</Button>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Top Queries with zero results */}
			{Array.isArray(analyticsData?.zeroResultQueries) &&
				analyticsData!.zeroResultQueries.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<TrendingDownIcon className="size-4 text-red-500" />
								{t("search.qualityScore.topZeroResults")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{analyticsData!.zeroResultQueries.slice(0, 10).map((q: { query: string; count: number }) => (
									<div
										key={q.query}
										className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
									>
										<span className="font-mono text-sm truncate">{q.query}</span>
										<span className="text-sm text-muted-foreground tabular-nums">
											{q.count}×
										</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}
		</div>
	);
}
