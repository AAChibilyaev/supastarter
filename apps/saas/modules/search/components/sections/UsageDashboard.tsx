"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = "last7" | "last30";

interface UsageDashboardProps {
	organizationId: string;
}

const PERIODS: Period[] = ["last7", "last30"];

function periodLabel(t: (key: string) => string, period: Period): string {
	switch (period) {
		case "last7":
			return t("dashboard.usage.period.7days");
		case "last30":
			return t("dashboard.usage.period.30days");
	}
}

function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

function quotaColor(percent: number): "success" | "warning" | "error" {
	if (percent >= 90) return "error";
	if (percent >= 70) return "warning";
	return "success";
}

// ─── Usage Period Selector ────────────────────────────────────────────────────

function UsagePeriodSelector({
	period,
	onChange,
}: {
	period: Period;
	onChange: (p: Period) => void;
}) {
	const t = useTranslations("search");
	return (
		<div className="gap-2 flex">
			{PERIODS.map((p) => (
				<Button
					key={p}
					variant={period === p ? "default" : "outline"}
					size="sm"
					onClick={() => onChange(p)}
				>
					{periodLabel(t, p)}
				</Button>
			))}
		</div>
	);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
	title,
	value,
	subtitle,
	color,
}: {
	title: string;
	value: string;
	subtitle?: string;
	color?: "success" | "warning" | "error";
}) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<p
					className={`text-2xl font-bold tabular-nums ${
						color === "error"
							? "text-destructive"
							: color === "warning"
								? "text-muted-foreground"
								: ""
					}`}
				>
					{value}
				</p>
				{subtitle && <p className="text-xs mt-1 text-muted-foreground">{subtitle}</p>}
			</CardContent>
		</Card>
	);
}

// ─── Quota Progress Bar ───────────────────────────────────────────────────────

function QuotaProgress({
	label,
	used,
	limit,
	unit,
}: {
	label: string;
	used: number;
	limit: number;
	unit?: string;
}) {
	const percent = Math.min(Math.round((used / limit) * 100), 100);
	const color = quotaColor(percent);
	return (
		<div className="space-y-1.5">
			<div className="text-sm flex items-center justify-between">
				<span className="font-medium">{label}</span>
				<span className="text-muted-foreground tabular-nums">
					{formatNumber(used)}
					{limit !== Infinity ? (
						<>
							{" / "}
							{formatNumber(limit)}
						</>
					) : (
						""
					)}
					{unit ?? ""}
				</span>
			</div>
			{limit !== Infinity && <Progress value={percent} className="h-2" data-status={color} />}
			{limit !== Infinity && (
				<p
					className={`text-xs ${
						color === "error"
							? "text-destructive"
							: color === "warning"
								? "text-muted-foreground"
								: "text-muted-foreground"
					}`}
				>
					{percent}% used
				</p>
			)}
		</div>
	);
}

// ─── By-Index Table ───────────────────────────────────────────────────────────

function UsageByIndexTable({
	rows,
	totalSearches,
}: {
	rows: Array<{ indexId: string; type: string; total: number }>;
	totalSearches: number;
}) {
	const t = useTranslations("search");

	const indexData = useMemo(() => {
		const searchMap = new Map<string, number>();
		const docMap = new Map<string, number>();

		for (const row of rows) {
			if (row.type === "search") {
				searchMap.set(row.indexId, (searchMap.get(row.indexId) ?? 0) + row.total);
			} else if (row.type === "index") {
				docMap.set(row.indexId, (docMap.get(row.indexId) ?? 0) + row.total);
			}
		}

		const allIds = new Set([...searchMap.keys(), ...docMap.keys()]);
		return Array.from(allIds).map((id) => ({
			indexId: id,
			searches: searchMap.get(id) ?? 0,
			documents: docMap.get(id) ?? 0,
		}));
	}, [rows]);

	if (indexData.length === 0) {
		return (
			<p className="text-sm py-4 text-center text-muted-foreground">
				{t("dashboard.usage.noData")}
			</p>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>{t("dashboard.usage.table.index")}</TableHead>
					<TableHead className="text-right tabular-nums">
						{t("dashboard.usage.table.searches")}
					</TableHead>
					<TableHead className="text-right tabular-nums">
						{t("dashboard.usage.table.documents")}
					</TableHead>
					<TableHead className="text-right tabular-nums">
						{t("dashboard.usage.table.percent")}
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{indexData.map((row) => (
					<TableRow key={row.indexId}>
						<TableCell className="font-medium">{row.indexId}</TableCell>
						<TableCell className="text-right">{formatNumber(row.searches)}</TableCell>
						<TableCell className="text-right">{formatNumber(row.documents)}</TableCell>
						<TableCell className="text-right">
							{totalSearches > 0
								? `${((row.searches / totalSearches) * 100).toFixed(1)}%`
								: "—"}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UsageDashboard({ organizationId }: UsageDashboardProps) {
	const t = useTranslations("search");
	const [period, setPeriod] = useState<Period>("last30");

	const windowDays = period === "last7" ? 7 : period === "last30" ? 30 : 90;

	// Summary data (includes plan limits)
	const {
		data: summary,
		isLoading: summaryLoading,
		error: summaryError,
	} = useQuery(
		orpc.search.usageSummary.queryOptions({
			input: { organizationId, period },
			enabled: !!organizationId,
		}),
	);

	// Usage by index
	const { data: usageData, isLoading: usageLoading } = useQuery(
		orpc.search.usage.queryOptions({
			input: { organizationId, windowDays },
			enabled: !!organizationId,
		}),
	);

	// Plan info for overage and reset date
	const { data: planInfo } = useQuery({
		...orpc.entitlements.plan.queryOptions({
			input: { organizationId },
		}),
		enabled: Boolean(organizationId),
	});

	const totalSearches = useMemo(
		() =>
			(usageData?.rows ?? [])
				.filter((r) => r.type === "search")
				.reduce((sum, r) => sum + r.total, 0),
		[usageData],
	);

	const isLoading = summaryLoading || usageLoading;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-10 w-72" />
				<div className="gap-4 sm:grid-cols-4 grid">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-28 rounded-xl" />
					))}
				</div>
				<Skeleton className="h-64 w-full rounded-xl" />
			</div>
		);
	}

	if (summaryError || !summary) {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-sm text-muted-foreground">
						{t("dashboard.usage.loadError")}
					</p>
				</CardContent>
			</Card>
		);
	}

	const searchesPercent = Math.min(
		Math.round((summary.searchesUsed / summary.searchesLimit) * 100),
		100,
	);
	const docsPercent = Math.min(
		Math.round((summary.documentsIndexed / summary.documentsLimit) * 100),
		100,
	);

	const planResetDate = summary?.periodEnd
		? new Date(summary.periodEnd).toLocaleDateString(undefined, {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: null;

	const overageAmount =
		summary.searchesUsed > summary.searchesLimit
			? `$${(((summary.searchesUsed - summary.searchesLimit) * 0.01) / 1000).toFixed(2)}`
			: "$0.00";

	return (
		<div className="space-y-6">
			{/* Period Selector */}
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">{t("dashboard.usage.title")}</h3>
				<UsagePeriodSelector period={period} onChange={setPeriod} />
			</div>

			{/* KPI Cards */}
			<div className="gap-4 sm:grid-cols-2 lg:grid-cols-4 grid">
				<KpiCard
					title={t("dashboard.usage.searches")}
					value={`${formatNumber(summary.searchesUsed)} / ${formatNumber(summary.searchesLimit)}`}
					subtitle={t("dashboard.usage.periodSearch", {
						days: windowDays,
					})}
					color={quotaColor(searchesPercent)}
				/>
				<KpiCard
					title={t("dashboard.usage.documents")}
					value={`${formatNumber(summary.documentsIndexed)} / ${formatNumber(summary.documentsLimit)}`}
					subtitle={t("dashboard.usage.totalIndexed")}
					color={quotaColor(docsPercent)}
				/>
				<KpiCard
					title={t("dashboard.usage.overage")}
					value={overageAmount}
					subtitle={
						summary.searchesUsed > summary.searchesLimit
							? t("dashboard.usage.overageActive")
							: t("dashboard.usage.noOverage")
					}
				/>
				<KpiCard
					title={t("dashboard.usage.planReset")}
					value={planResetDate ?? "—"}
					subtitle={
						planInfo?.status === "trialing"
							? t("dashboard.usage.trialStatus")
							: t("dashboard.usage.currentCycle")
					}
				/>
			</div>

			{/* Quota Progress */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("dashboard.usage.quotaTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<QuotaProgress
						label={t("dashboard.usage.searchQuota")}
						used={summary.searchesUsed}
						limit={summary.searchesLimit}
					/>
					<QuotaProgress
						label={t("dashboard.usage.documentQuota")}
						used={summary.documentsIndexed}
						limit={summary.documentsLimit}
					/>
				</CardContent>
			</Card>

			{/* By-Index Breakdown */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("dashboard.usage.byIndexTitle")}</CardTitle>
				</CardHeader>
				<CardContent>
					<UsageByIndexTable rows={usageData?.rows ?? []} totalSearches={totalSearches} />
				</CardContent>
			</Card>
		</div>
	);
}
