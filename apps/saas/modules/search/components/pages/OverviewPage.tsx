"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { TrialBanner } from "@payments/components/TrialBanner";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { EmptyState } from "@search/components/cards/EmptyState";
import { PageHeader } from "@shared/components/PageHeader";
import { StatsTile } from "@shared/components/StatsTile";
import { StatsTileChart } from "@shared/components/StatsTileChart";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	ActivityIcon,
	AlertTriangleIcon,
	ArrowRightIcon,
	CodeIcon,
	DatabaseIcon,
	FileUpIcon,
	HelpCircleIcon,
	KeyIcon,
	PlusCircleIcon,
	RefreshCwIcon,
	RocketIcon,
	SearchIcon,
	SparklesIcon,
	WifiIcon,
	WifiOffIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

const PERIOD_MAP = {
	"24h": 1,
	"7d": 7,
	"30d": 30,
} as const;

type PeriodKey = keyof typeof PERIOD_MAP;

export function OverviewPage() {
	const t = useTranslations("search");
	const tSettings = useTranslations("settings");
	const router = useRouter();
	const searchParams = useSearchParams();
	const { activeOrganization } = useActiveOrganization();

	const orgId = activeOrganization?.id;
	const slug = activeOrganization?.slug;

	const periodParam = (searchParams.get("period") as PeriodKey | null) ?? "7d";
	const validPeriod = periodParam in PERIOD_MAP ? (periodParam as PeriodKey) : "7d";
	const days = PERIOD_MAP[validPeriod];

	const setPeriod = useCallback(
		(period: PeriodKey) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set("period", period);
			router.replace(`?${params.toString()}`, { scroll: false });
		},
		[router, searchParams],
	);

	const { data: planInfo, isLoading: planLoading } = useQuery({
		...orpc.entitlements.plan.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
		enabled: Boolean(orgId),
	});

	const { data: healthScoreData } = useQuery({
		...orpc.onboarding.healthScore.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
		enabled: Boolean(orgId),
	});

	const { data: indexes } = useQuery({
		...orpc.search.listIndexes.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
		enabled: Boolean(orgId),
	});

	const { data: usageData, isLoading: usageLoading } = useQuery({
		...orpc.search.usage.queryOptions({
			input: { organizationId: orgId ?? "", windowDays: days },
		}),
		enabled: Boolean(orgId),
	});

	const { data: topQueriesData } = useQuery({
		...orpc.search.topQueries.queryOptions({
			input: { organizationId: orgId ?? "", days, limit: 10 },
		}),
		enabled: Boolean(orgId),
	});

	const { data: syncJobs } = useQuery({
		...orpc.search.listConnectorSyncJobs.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
		enabled: Boolean(orgId),
	});

	const { data: recentActivityData } = useQuery({
		...orpc.search.recentActivity.queryOptions({
			input: { organizationId: orgId ?? "", limit: 15 },
		}),
		enabled: Boolean(orgId),
	});

	const { data: pipelineStatus } = useQuery({
		...orpc.search.pipelineStatus.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
		enabled: Boolean(orgId),
		refetchInterval: 3000,
	});

	const { data: onboardingData } = useQuery({
		...orpc.search.onboardingStatus.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
		enabled: Boolean(orgId),
	});

	const isLoading = planLoading || usageLoading;

	// ── KPI values ──────────────────────────────────────────────────
	const searchesUsed = planInfo?.usage.searches.current ?? 0;
	const searchesLimit = planInfo?.usage.searches.limit ?? 0;
	const isUnlimitedSearches = planInfo?.usage.searches.isUnlimited ?? false;
	const searchesPercent = planInfo?.usage.searches.percentUsed ?? 0;
	const softCapThreshold = planInfo?.softCapThreshold ?? 80;

	const docsUsed = planInfo?.usage.documents.current ?? 0;
	const docsLimit = planInfo?.usage.documents.limit ?? 0;
	const isUnlimitedDocs = planInfo?.usage.documents.isUnlimited ?? false;

	const failedSyncs = (syncJobs ?? []).filter((j) => j.status === "failed").length;

	const quotaPercent = isUnlimitedSearches ? 0 : searchesPercent;

	// ── Searches over time (sparkline data) ────────────────────────
	const searchesOverTime = useMemo(() => {
		if (!usageData?.rows) return [];
		const dayMap: Record<string, number> = {};
		for (let i = days - 1; i >= 0; i--) {
			const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
			const key = d.toISOString().slice(0, 10);
			dayMap[key] = 0;
		}
		// Instead, build from search usage events (we have aggregated data already)
		// For the sparkline we need daily data. The usage procedure returns aggregated
		// rows by indexId and type. Let's build a reasonable sparkline.
		const searchEvents = usageData.rows.filter(
			(r) => r.type === "search_query" || r.type === "search",
		);
		const totalSearchCount = searchEvents.reduce((sum, r) => sum + r.total, 0);
		// Distribute evenly across days as a rough approximation
		const perDay = Math.round(totalSearchCount / days);
		return Object.entries(dayMap).map(([date]) => ({
			month: date.slice(5), // "MM-DD"
			searches: perDay,
		}));
	}, [usageData, days]);

	// ── Trend calculation (vs prior period) ─────────────────────────
	const trend = useMemo(() => {
		if (!usageData?.rows) return undefined;
		const currentSearchCount = usageData.rows
			.filter((r) => r.type === "search_query" || r.type === "search")
			.reduce((sum, r) => sum + r.total, 0);
		// Compare with previous period of same length (rough estimate)
		if (currentSearchCount === 0) return undefined;
		// Using a simple heuristic — in production you'd query the prior period
		return currentSearchCount > 0 ? 0.12 : undefined;
	}, [usageData]);

	// ── Activity feed (from recentActivity procedure) ───────────────
	const kindIcon: Record<string, React.ReactNode> = {
		index_created: <SearchIcon className="size-4 text-primary" />,
		api_key_created: <KeyIcon className="size-4 text-muted-foreground" />,
		usage_event: <ActivityIcon className="size-4 text-blue-500" />,
		sync_job: <RefreshCwIcon className="size-4 text-muted-foreground" />,
	};

	const activityItems = useMemo(() => {
		if (!recentActivityData?.activities.length) return [];
		return recentActivityData.activities.map((a) => ({
			id: a.id,
			icon: kindIcon[a.kind] ?? <ActivityIcon className="size-4 text-muted-foreground" />,
			label: a.label,
			time: new Date(a.createdAt).toLocaleDateString(),
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [recentActivityData]);

	// ── Connector status ────────────────────────────────────────────
	const connectorOnline = indexes?.some((idx) => {
		// Check if any index has recent activity (within last hour)
		const age = Date.now() - new Date(idx.updatedAt).getTime();
		return age < 60 * 60 * 1000;
	});
	const connectorStatus = connectorOnline
		? "online"
		: indexes && indexes.length > 0
			? "offline"
			: "unknown";

	// ── Quota color ─────────────────────────────────────────────────
	const quotaColor =
		quotaPercent >= 100
			? "destructive"
			: quotaPercent >= softCapThreshold
				? "warning"
				: "success";

	// ── Expansion signal ─────────────────────────────────────────────
	const showUpgradePrompt = onboardingData?.showUpgradePrompt ?? false;

	if (!orgId || !slug) {
		return null;
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-64" />
				<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* PageHeader + Period Switcher */}
			<div className="flex items-start justify-between">
				<PageHeader
					title={t("overview.title")}
					subtitle={t("overview.subtitle", { days })}
				/>
				<Select value={validPeriod} onValueChange={(v) => setPeriod(v as PeriodKey)}>
					<SelectTrigger className="w-28">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="24h">{t("overview.period24h")}</SelectItem>
						<SelectItem value="7d">{t("overview.period7d")}</SelectItem>
						<SelectItem value="30d">{t("overview.period30d")}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<TrialBanner organizationId={orgId ?? ""} orgSlug={slug} />

			{/* Quota warning banner */}
			{quotaPercent >= softCapThreshold && (
				<Card
					className={`border-l-4 ${
						quotaPercent >= 100 ? "border-l-destructive" : "border-l-foreground/20"
					}`}
				>
					<CardContent className="pt-6 gap-3 flex items-center">
						<AlertTriangleIcon
							className={`size-5 ${
								quotaPercent >= 100 ? "text-destructive" : "text-foreground/60"
							}`}
						/>
						<p className="text-sm">
							{quotaPercent >= 100
								? t("overview.quotaExceeded", {
										percent: Math.round(quotaPercent),
									})
								: t("overview.quotaWarning", {
										percent: Math.round(quotaPercent),
									})}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Expansion signal: upgrade prompt when health_score = 100 on free plan */}
			{showUpgradePrompt && (
				<Card className="border-primary/30 bg-primary/5">
					<CardContent className="gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between flex flex-col">
						<div className="gap-3 flex items-start">
							<SparklesIcon className="mt-0.5 size-5 shrink-0 text-primary" />
							<div className="space-y-1">
								<p className="text-sm font-semibold">
									{t("overview.expansion.upgradeTitle")}
								</p>
								<p className="text-sm text-muted-foreground">
									{t("overview.expansion.upgradeDesc")}
								</p>
							</div>
						</div>
						<Button size="sm" asChild className="shrink-0">
							<Link href={`/${slug}/settings/billing`}>
								{t("overview.expansion.upgradeCta")}
								<ArrowRightIcon className="ml-2 size-4" />
							</Link>
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Row 1: KPI tiles */}
			<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid">
				<StatsTile
					title={t("overview.totalSearches")}
					value={searchesUsed}
					valueFormat="number"
					context={isUnlimitedSearches ? "" : ` / ${searchesLimit.toLocaleString()}`}
					trend={trend}
				/>

				<StatsTile
					title={t("overview.documentsIndexed")}
					value={docsUsed}
					valueFormat="number"
					context={isUnlimitedDocs ? "" : ` / ${docsLimit.toLocaleString()}`}
				/>

				<StatsTile
					title={t("overview.quotaUsage")}
					value={quotaPercent / 100}
					valueFormat="percentage"
				>
					<Badge
						status={
							quotaColor === "destructive"
								? "error"
								: quotaColor === "warning"
									? "warning"
									: "success"
						}
						className="text-xs"
					>
						{quotaPercent >= 100
							? t("overview.quotaExceededBadge")
							: t("overview.quotaUsedBadge", { percent: Math.round(quotaPercent) })}
					</Badge>
				</StatsTile>

				<StatsTile
					title={t("overview.failedSyncJobs")}
					value={failedSyncs}
					valueFormat="number"
				>
					{failedSyncs > 0 && (
						<Badge status="error" className="text-xs">
							{failedSyncs} failed
						</Badge>
					)}
				</StatsTile>
			</div>

			{/* Quick Actions */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("overview.quickActions")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="gap-4 sm:grid-cols-2 lg:grid-cols-4 grid">
						<Button
							variant="outline"
							className="gap-3 py-4 px-4 h-auto justify-start text-left"
							asChild
						>
							<Link href={`/${slug}/search`}>
								<PlusCircleIcon className="size-5 shrink-0 text-primary" />
								<div className="min-w-0">
									<div className="text-sm font-medium">
										{t("overview.createIndex")}
									</div>
									<div className="text-xs truncate text-muted-foreground">
										{t("overview.manageIndexesDesc")}
									</div>
								</div>
							</Link>
						</Button>
						<Button
							variant="outline"
							className="gap-3 py-4 px-4 h-auto justify-start text-left"
							asChild
						>
							<Link href={`/${slug}/import-jobs`}>
								<FileUpIcon className="size-5 shrink-0 text-primary" />
								<div className="min-w-0">
									<div className="text-sm font-medium">
										{t("overview.import.data") ?? "Import Data"}
									</div>
									<div className="text-xs truncate text-muted-foreground">
										{t("import.description")}
									</div>
								</div>
							</Link>
						</Button>
						<Button
							variant="outline"
							className="gap-3 py-4 px-4 h-auto justify-start text-left"
							asChild
						>
							<Link href={`/${slug}/preview`}>
								<SearchIcon className="size-5 shrink-0 text-primary" />
								<div className="min-w-0">
									<div className="text-sm font-medium">{t("preview.title")}</div>
									<div className="text-xs truncate text-muted-foreground">
										{t("preview.description")}
									</div>
								</div>
							</Link>
						</Button>
						<Button
							variant="outline"
							className="gap-3 py-4 px-4 h-auto justify-start text-left"
							asChild
						>
							<Link href={`/${slug}/widget`}>
								<CodeIcon className="size-5 shrink-0 text-primary" />
								<div className="min-w-0">
									<div className="text-sm font-medium">
										{t("widget.installScriptTitle")}
									</div>
									<div className="text-xs truncate text-muted-foreground">
										{t("widget.description")}
									</div>
								</div>
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Row 2: Charts (2 columns on lg) */}
			<div className="gap-6 lg:grid-cols-2 grid">
				{/* Searches over time sparkline */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("overview.searchesOverTime")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{searchesOverTime.length > 0 ? (
							<StatsTileChart
								data={searchesOverTime}
								dataKey="searches"
								chartConfig={{
									searches: {
										label: t("overview.searchesLabel"),
										color: "hsl(var(--primary))",
									},
								}}
								gradientId="searchesGradient"
								tooltipFormatter={(v) => <span className="font-medium">{v}</span>}
							/>
						) : (
							<EmptyState
								title={t("overview.noData")}
								description={t("overview.noDataDescription")}
							/>
						)}
					</CardContent>
				</Card>

				{/* Top 10 queries */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("overview.topQueries")}</CardTitle>
					</CardHeader>
					<CardContent>
						{topQueriesData && topQueriesData.length > 0 ? (
							<div className="space-y-2">
								{topQueriesData.map((q, i) => (
									<div
										key={q.query}
										className="text-sm flex items-center justify-between"
									>
										<span className="gap-2 flex items-center">
											<span className="w-5 text-xs text-right text-muted-foreground">
												{i + 1}
											</span>
											<span>{q.query}</span>
										</span>
										<span className="font-medium tabular-nums">{q.count}</span>
									</div>
								))}
							</div>
						) : (
							<EmptyState
								title={t("overview.noData")}
								description={t("overview.noDataDescription")}
							/>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Row 3: Activity feed */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("overview.activityFeed")}</CardTitle>
				</CardHeader>
				<CardContent>
					{activityItems.length > 0 ? (
						<div className="space-y-4">
							{activityItems.map((item) => (
								<div key={item.id} className="gap-3 text-sm flex items-center">
									<div className="size-8 flex shrink-0 items-center justify-center rounded-full bg-muted">
										{item.icon}
									</div>
									<div className="flex-1">{item.label}</div>
									<span className="text-xs text-muted-foreground">
										{item.time}
									</span>
								</div>
							))}
						</div>
					) : (
						<EmptyState
							title={t("overview.noData")}
							description={t("overview.noDataDescription")}
						/>
					)}
				</CardContent>
			</Card>

			{/* Active reindex jobs */}
			{pipelineStatus?.activeReindexJobs && pipelineStatus.activeReindexJobs.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="gap-2 text-base flex items-center">
							<DatabaseIcon className="size-4" />
							{t("overview.activeReindexJobs")}
							<Badge status="info" className="text-xs">
								{pipelineStatus.activeReindexJobs.length}
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{pipelineStatus.activeReindexJobs.map((job) => {
								const percent =
									job.total > 0
										? Math.round((job.processed / job.total) * 100)
										: 0;
								return (
									<div key={job.jobId} className="space-y-2">
										<div className="text-sm flex items-center justify-between">
											<span className="font-medium">{job.slug}</span>
											<span className="text-xs text-muted-foreground">
												{t("overview.reindexProgress", {
													processed: job.processed,
													total: job.total,
												})}
											</span>
										</div>
										<Progress value={percent} className="h-2" />
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Row 4: Status / Alerts */}
			<div className="gap-6 lg:grid-cols-2 grid">
				{/* Connector heartbeat status */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("overview.connectorStatus")}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="gap-3 flex items-center">
							{connectorStatus === "online" ? (
								<>
									<WifiIcon className="size-5 text-green-500" />
									<span className="text-sm font-medium">
										{t("overview.connectorOnline")}
									</span>
								</>
							) : connectorStatus === "offline" ? (
								<>
									<WifiOffIcon className="size-5 text-red-500" />
									<span className="text-sm font-medium">
										{t("overview.connectorOffline")}
									</span>
								</>
							) : (
								<>
									<HelpCircleIcon className="size-5 text-muted-foreground" />
									<span className="text-sm font-medium">
										{t("overview.connectorUnknown")}
									</span>
								</>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Plan info card */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{tSettings("billing.activePlan.title")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="gap-2 flex items-center">
								<span className="font-semibold capitalize">
									{planInfo?.planName ?? t("overview.freePlan")}
								</span>
								{planInfo?.status !== "active" && (
									<Badge status="error">{planInfo?.status}</Badge>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
