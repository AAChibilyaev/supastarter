"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Activity, ArrowRight, Database, RefreshCw, Search, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { EmptyState } from "./EmptyState";

function ActivityIcon({ kind }: { kind: string }) {
	switch (kind) {
		case "index_created":
			return <Database className="size-4 text-primary" />;
		case "api_key_created":
			return <Activity className="size-4 text-blue-500" />;
		case "sync_job":
			return <RefreshCw className="size-4 text-amber-500" />;
		default:
			return <Search className="size-4 text-muted-foreground" />;
	}
}

export function DashboardOverview() {
	const t = useTranslations("search");
	const { activeOrganization } = useActiveOrganization();
	const orgId = activeOrganization?.id;
	const slug = activeOrganization?.slug;

	// ── Queries ──────────────────────────────────────────────────────

	const { data: planInfo, isLoading: planLoading } = useQuery({
		...orpc.entitlements.plan.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
		enabled: Boolean(orgId),
	});

	const { data: usageData } = useQuery(
		orpc.search.usageSummary.queryOptions({
			input: { organizationId: orgId ?? "", period: "last7" },
			enabled: Boolean(orgId),
		}),
	);

	const { data: pipelineData } = useQuery(
		orpc.search.pipelineStatus.queryOptions({
			input: { organizationId: orgId ?? "" },
			enabled: Boolean(orgId),
		}),
	);

	const { data: activityData } = useQuery(
		orpc.search.recentActivity.queryOptions({
			input: { organizationId: orgId ?? "", limit: 10 },
			enabled: Boolean(orgId),
		}),
	);

	const { data: topQueriesData } = useQuery(
		orpc.search.topQueries.queryOptions({
			input: { organizationId: orgId ?? "", days: 7, limit: 5 },
			enabled: Boolean(orgId),
		}),
	);

	// ── Derived values ───────────────────────────────────────────────

	const searchesUsed = usageData?.searchesUsed ?? 0;
	const documentsIndexed = usageData?.documentsIndexed ?? 0;
	const failedCount = pipelineData?.failedCount ?? 0;

	const hasUsage = (planInfo?.usage?.searches?.current ?? 0) > 0 || searchesUsed > 0;

	const planName = planInfo?.planName ?? "Free";
	const planStatus = planInfo?.status ?? "active";
	const quotaPercent = planInfo?.usage?.searches?.percentUsed ?? 0;
	const isUnlimited = planInfo?.usage?.searches?.isUnlimited ?? false;

	const activities = activityData?.activities ?? [];
	const topQueries = topQueriesData ?? [];

	if (!orgId || !slug) return null;

	// ── Loading state ────────────────────────────────────────────────

	if (planLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-20 w-full" />
				<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
			</div>
		);
	}

	// ── Quota colour helpers ─────────────────────────────────────────

	const quotaColor =
		quotaPercent < 80
			? "text-green-500"
			: quotaPercent < 100
				? "text-amber-500"
				: "text-red-500";

	// ── Empty state (brand-new org — no searches yet) ────────────────

	if (!hasUsage) {
		return (
			<div className="space-y-8">
				{/* Plan banner */}
				<Card
					className={`border-l-4 ${planStatus === "active" ? "border-l-primary" : "border-l-destructive"}`}
				>
					<CardContent className="pt-6 flex items-center justify-between">
						<div>
							<div className="gap-2 flex items-center">
								<span className="text-lg font-semibold">{planName}</span>
								{planStatus !== "active" && (
									<Badge status="error">{planStatus}</Badge>
								)}
							</div>
							<p className="text-sm mt-1 text-muted-foreground">
								{t("overview.active")}
							</p>
						</div>
						<Button variant="outline" asChild>
							<Link href={`/${slug}/settings/billing`}>
								{t("overview.managePlan")}
							</Link>
						</Button>
					</CardContent>
				</Card>

				{/* Empty state */}
				<EmptyState
					title={t("overview.noSearchesYet")}
					description={t("overview.emptyStateDescription")}
					icon={Search}
					action={{
						label: t("overview.getStarted"),
						href: `/${slug}/getting-started`,
					}}
				/>
			</div>
		);
	}

	// ── Main dashboard ───────────────────────────────────────────────

	return (
		<div className="space-y-8">
			{/* Plan banner with usage bar */}
			<Card
				className={`border-l-4 ${planStatus === "active" ? "border-l-primary" : "border-l-destructive"}`}
			>
				<CardContent className="pt-6">
					<div className="flex items-center justify-between">
						<div>
							<div className="gap-2 flex items-center">
								<span className="text-lg font-semibold">{planName}</span>
								{planStatus !== "active" && (
									<Badge status="error">{planStatus}</Badge>
								)}
							</div>
							<p className="text-sm mt-1 text-muted-foreground">
								{planInfo?.graceReadsUntil
									? t("overview.graceUntil", {
											date: new Date(
												planInfo.graceReadsUntil,
											).toLocaleDateString(),
										})
									: t("overview.active")}
							</p>
						</div>
						<Button variant="outline" asChild>
							<Link href={`/${slug}/settings/billing`}>
								{t("overview.managePlan")}
							</Link>
						</Button>
					</div>

					{!isUnlimited && (
						<div className="mt-4 gap-4 flex items-center">
							<Progress value={quotaPercent} className="h-2 flex-1" />
							<span className={`text-sm font-medium whitespace-nowrap ${quotaColor}`}>
								{quotaPercent}%
							</span>
							{quotaPercent >= 80 && (
								<Button size="sm" asChild>
									<Link href={`/${slug}/settings/billing`}>
										{t("overview.upgrade")}
										<ArrowRight className="ml-1 size-3" />
									</Link>
								</Button>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* KPI row — 4 cols → 2 cols → 1 col */}
			<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>{t("overview.totalSearches")}</CardDescription>
						<CardTitle className="text-2xl">{searchesUsed.toLocaleString()}</CardTitle>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription>{t("overview.documentsIndexed")}</CardDescription>
						<CardTitle className="text-2xl">
							{documentsIndexed.toLocaleString()}
						</CardTitle>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription>{t("overview.quotaUsage")}</CardDescription>
						<CardTitle className={`text-2xl ${quotaColor}`}>
							{isUnlimited ? "∞" : `${quotaPercent}%`}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{!isUnlimited && <Progress value={quotaPercent} className="h-2" />}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription>{t("overview.failedSyncJobs")}</CardDescription>
						<CardTitle className={`text-2xl ${failedCount > 0 ? "text-red-500" : ""}`}>
							{failedCount}
						</CardTitle>
					</CardHeader>
				</Card>
			</div>

			{/* Quick actions row */}
			<div className="gap-3 md:grid-cols-3 grid">
				<Button asChild variant="outline" className="py-4 h-auto">
					<Link href={`/${slug}/search`}>
						<Database className="mr-2 size-4" />
						{t("overview.createIndex")}
					</Link>
				</Button>
				<Button asChild variant="outline" className="py-4 h-auto">
					<Link href={`/${slug}/connectors`}>
						<RefreshCw className="mr-2 size-4" />
						{t("overview.addConnector")}
					</Link>
				</Button>
				<Button asChild variant="outline" className="py-4 h-auto">
					<Link href={`/${slug}/analytics`}>
						<TrendingUp className="mr-2 size-4" />
						{t("overview.viewAnalytics")}
					</Link>
				</Button>
			</div>

			{/* Two-column grid: Recent activity + Top queries */}
			<div className="gap-6 md:grid-cols-2 grid">
				{/* Recent activity feed */}
				<Card>
					<CardHeader>
						<CardTitle className="gap-2 text-base flex items-center">
							<Activity className="size-4" />
							{t("overview.activityFeed")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{activities.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("overview.noData")}</p>
						) : (
							<div className="space-y-4">
								{activities.slice(0, 10).map((activity) => (
									<div key={activity.id} className="gap-3 flex items-start">
										<div className="mt-0.5">
											<ActivityIcon kind={activity.kind} />
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-sm truncate">
												{activity.description}
											</p>
											<p className="text-xs text-muted-foreground">
												{formatDistanceToNow(new Date(activity.createdAt), {
													addSuffix: true,
												})}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Top queries mini-list */}
				<Card>
					<CardHeader>
						<CardTitle className="gap-2 text-base flex items-center">
							<TrendingUp className="size-4" />
							{t("overview.topQueries")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{topQueries.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("overview.noData")}</p>
						) : (
							<div className="space-y-3">
								{topQueries.slice(0, 5).map((q, i) => (
									<div key={q.query} className="gap-2 flex items-center">
										<span className="w-5 text-xs font-medium text-muted-foreground">
											{i + 1}
										</span>
										<span className="text-sm flex-1 truncate">{q.query}</span>
										<span className="text-sm text-muted-foreground tabular-nums">
											{q.count}
										</span>
									</div>
								))}
								<Link
									href={`/${slug}/analytics`}
									className="mt-2 text-sm inline-flex items-center text-primary hover:underline"
								>
									{t("overview.viewAll")}
									<ArrowRight className="ml-1 size-3" />
								</Link>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
