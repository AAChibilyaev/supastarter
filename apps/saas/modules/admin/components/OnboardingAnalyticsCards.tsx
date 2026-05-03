"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
	Cell,
} from "recharts";

interface FunnelStep {
	eventType: string;
	label: string;
	completed: number;
	total: number;
	rate: number;
	dropOff: number;
}

interface TimeToFirstValue {
	medianHours: number | null;
	meanHours: number | null;
	minHours: number | null;
	maxHours: number | null;
	count: number;
}

interface CohortRow {
	week: string;
	orgCount: number;
	emailVerified: number;
	firstCollection: number;
	firstDocument: number;
	firstSearch: number;
	widgetEmbedded: number;
	firstTeamMember: number;
	firstIntegration: number;
	firstPayment: number;
}

interface HealthScoreBucket {
	label: string;
	minScore: number;
	maxScore: number;
	count: number;
}

interface HealthScoreDistribution {
	totalOrgs: number;
	activeOrgs: number;
	buckets: HealthScoreBucket[];
}

interface AnalyticsData {
	funnel: FunnelStep[];
	timeToFirstValue: TimeToFirstValue;
	cohorts: CohortRow[];
	healthScoreDistribution: HealthScoreDistribution;
}

const FUNNEL_COLORS = [
	"#22c55e",
	"#16a34a",
	"#15803d",
	"#166534",
	"#14532d",
	"#3b82f6",
	"#2563eb",
	"#1d4ed8",
];

function formatHours(hours: number | null): string {
	if (hours === null) return "\u2014";
	if (hours < 1) return `${Math.round(hours * 60)} min`;
	if (hours < 24) return `${Math.round(hours)} h`;
	const days = Math.round((hours / 24) * 10) / 10;
	return `${days} d`;
}

function csvEscape(val: string | number): string {
	const s = String(val);
	if (s.includes(",") || s.includes('"') || s.includes("\n")) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

function downloadCsv(data: AnalyticsData) {
	const rows: string[] = [];

	// Funnel section
	rows.push("Onboarding Funnel");
	rows.push(["Step", "Completed", "Total", "Rate (%)", "Drop-off (%)"].join(","));
	for (const step of data.funnel) {
		rows.push(
			[csvEscape(step.label), step.completed, step.total, step.rate, step.dropOff].join(","),
		);
	}

	rows.push("");
	rows.push("Time to First Value (hours)");
	rows.push(["Median", "Mean", "Min", "Max", "Completed Count"].join(","));
	const ttfv = data.timeToFirstValue;
	rows.push(
		[
			ttfv.medianHours ?? "",
			ttfv.meanHours ?? "",
			ttfv.minHours ?? "",
			ttfv.maxHours ?? "",
			ttfv.count,
		].join(","),
	);

	rows.push("");
	rows.push("Cohort Analysis (by signup week)");
	rows.push(
		[
			"Week",
			"Orgs",
			"Email Verified",
			"First Collection",
			"First Document",
			"First Search",
			"Widget Embedded",
			"Team Member",
			"Connector",
			"Payment",
		].join(","),
	);
	for (const cohort of data.cohorts) {
		rows.push(
			[
				cohort.week,
				cohort.orgCount,
				cohort.emailVerified,
				cohort.firstCollection,
				cohort.firstDocument,
				cohort.firstSearch,
				cohort.widgetEmbedded,
				cohort.firstTeamMember,
				cohort.firstIntegration,
				cohort.firstPayment,
			].join(","),
		);
	}

	rows.push("");
	rows.push("Health Score Distribution");
	rows.push(["Bucket", "Orgs", "Active", "Total"].join(","));
	for (const bucket of data.healthScoreDistribution.buckets) {
		rows.push(
			[
				bucket.label,
				bucket.count,
				data.healthScoreDistribution.activeOrgs,
				data.healthScoreDistribution.totalOrgs,
			].join(","),
		);
	}

	const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "onboarding-analytics.csv";
	a.click();
	URL.revokeObjectURL(url);
}

function FunnelChart({ funnel }: { funnel: FunnelStep[] }) {
	if (funnel.length === 0) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Onboarding Funnel</CardTitle>
			</CardHeader>
			<CardContent>
				<div style={{ width: "100%", height: 400 }}>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={funnel}
							layout="vertical"
							margin={{ top: 8, right: 24, left: 120, bottom: 8 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								className="stroke-border"
								horizontal={false}
							/>
							<XAxis
								type="number"
								domain={[0, 100]}
								tick={{ fontSize: 12 }}
								className="text-muted-foreground"
								unit="%"
							/>
							<YAxis
								type="category"
								dataKey="label"
								tick={{ fontSize: 12 }}
								className="text-muted-foreground"
								width={130}
							/>
							<Tooltip
								formatter={(
									value: number,
									_name: string,
									props: { payload: FunnelStep },
								) => {
									const step = props.payload;
									return [
										`${step.completed} / ${step.total} (${step.rate}%)`,
										step.label,
									];
								}}
							/>
							<Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={28}>
								{funnel.map((_entry, index) => (
									<Cell
										key={index}
										fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]}
									/>
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>

				{/* Funnel step details */}
				<div className="gap-2 mt-4 sm:grid-cols-2 lg:grid-cols-4 grid grid-cols-1">
					{funnel.map((step) => (
						<div
							key={step.eventType}
							className="space-y-1 p-3 text-sm rounded-lg border"
						>
							<div className="font-medium">{step.label}</div>
							<div className="text-muted-foreground">
								{step.completed} / {step.total}
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">{step.rate}%</span>
								{step.dropOff > 0 && (
									<span className="text-destructive">-{step.dropOff}%</span>
								)}
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function TimeToFirstValueCard({ ttfv }: { ttfv: TimeToFirstValue }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Time to First Value</CardTitle>
			</CardHeader>
			<CardContent>
				{ttfv.count === 0 ? (
					<div className="py-8 text-sm text-center text-muted-foreground">
						No data yet \u2014 waiting for first searches
					</div>
				) : (
					<div className="gap-4 sm:grid-cols-4 grid grid-cols-2">
						<div className="space-y-1">
							<div className="text-xs text-muted-foreground">Median</div>
							<div className="font-medium text-2xl">
								{formatHours(ttfv.medianHours)}
							</div>
						</div>
						<div className="space-y-1">
							<div className="text-xs text-muted-foreground">Mean</div>
							<div className="font-medium text-lg">{formatHours(ttfv.meanHours)}</div>
						</div>
						<div className="space-y-1">
							<div className="text-xs text-muted-foreground">Min</div>
							<div className="font-medium text-lg">{formatHours(ttfv.minHours)}</div>
						</div>
						<div className="space-y-1">
							<div className="text-xs text-muted-foreground">Max</div>
							<div className="font-medium text-lg">{formatHours(ttfv.maxHours)}</div>
						</div>
					</div>
				)}
				{ttfv.count > 0 && (
					<div className="mt-2 text-xs text-muted-foreground">
						Based on {ttfv.count} organization{ttfv.count !== 1 ? "s" : ""} with
						completed searches
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function CohortTable({ cohorts }: { cohorts: CohortRow[] }) {
	if (cohorts.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Cohort Analysis</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="py-8 text-sm text-center text-muted-foreground">
						No cohort data available yet
					</div>
				</CardContent>
			</Card>
		);
	}

	const events = [
		{ key: "emailVerified" as const, label: "Email" },
		{ key: "firstCollection" as const, label: "Collection" },
		{ key: "firstDocument" as const, label: "Document" },
		{ key: "firstSearch" as const, label: "Search" },
		{ key: "widgetEmbedded" as const, label: "Widget" },
		{ key: "firstTeamMember" as const, label: "Team" },
		{ key: "firstIntegration" as const, label: "Connector" },
		{ key: "firstPayment" as const, label: "Payment" },
	] as const;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Cohort Analysis</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<table className="text-xs min-w-full">
						<thead>
							<tr className="border-b text-left">
								<th className="p-2 font-medium">Week</th>
								<th className="p-2 font-medium">Orgs</th>
								{events.map((evt) => (
									<th key={evt.key} className="p-2 font-medium">
										{evt.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{cohorts.map((row) => {
								const rate = (val: number) =>
									row.orgCount > 0
										? `${Math.round((val / row.orgCount) * 100)}%`
										: "\u2014";
								return (
									<tr key={row.week} className="border-b hover:bg-muted/50">
										<td className="p-2 font-medium whitespace-nowrap">
											{row.week}
										</td>
										<td className="p-2">{row.orgCount}</td>
										{events.map((evt) => (
											<td key={evt.key} className="p-2">
												{row[evt.key]} ({rate(row[evt.key])})
											</td>
										))}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
}

function HealthScoreChart({ distribution }: { distribution: HealthScoreDistribution }) {
	if (distribution.buckets.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Health Score Distribution</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="py-8 text-sm text-center text-muted-foreground">
						No data available yet
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Health Score Distribution</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="mb-2 text-sm text-muted-foreground">
					{distribution.activeOrgs} active / {distribution.totalOrgs} total organizations
				</div>
				<div style={{ width: "100%", height: 250 }}>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={distribution.buckets}
							margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
						>
							<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
							<XAxis
								dataKey="label"
								tick={{ fontSize: 12 }}
								className="text-muted-foreground"
							/>
							<YAxis
								tick={{ fontSize: 12 }}
								className="text-muted-foreground"
								allowDecimals={false}
							/>
							<Tooltip
								formatter={(
									value: number,
									_name: string,
									props: { payload: HealthScoreBucket },
								) => {
									const bucket = props.payload;
									return [
										`${bucket.count} org${bucket.count !== 1 ? "s" : ""} (score ${bucket.label})`,
										"Orgs",
									];
								}}
							/>
							<Bar
								dataKey="count"
								radius={[4, 4, 0, 0]}
								fill="#6366f1"
								maxBarSize={48}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}

export function OnboardingAnalyticsCards() {
	const t = useTranslations("admin.onboarding");
	const query = useQuery(orpc.onboarding.analytics.queryOptions({}));

	const isLoading = query.isLoading;
	const error = query.error;
	const data = query.data as AnalyticsData | undefined;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="gap-4 md:grid-cols-2 grid grid-cols-1">
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
				</div>
				<Skeleton className="h-64" />
			</div>
		);
	}

	if (error) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-destructive">
					{t("error")}
				</CardContent>
			</Card>
		);
	}

	if (!data) return null;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-lg">{t("pageTitle")}</h2>
				<Button variant="outline" size="sm" onClick={() => downloadCsv(data)}>
					{t("exportCsv")}
				</Button>
			</div>

			<TimeToFirstValueCard ttfv={data.timeToFirstValue} />
			<HealthScoreChart distribution={data.healthScoreDistribution} />
			<FunnelChart funnel={data.funnel} />
			<CohortTable cohorts={data.cohorts} />
		</div>
	);
}
