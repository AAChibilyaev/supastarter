"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Label } from "@repo/ui/components/label";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FailedQueryEntry {
	query: string;
	count: number;
}

interface TopQueryEntry {
	query: string;
	count: number | string;
}

interface AnalyticsData {
	totalSearches: number;
	impressionsCount?: number;
	searchesOverTime?: Array<{ date: string; count: number }>;
	zeroResultQueries?: FailedQueryEntry[];
	latencyP50?: number | null;
	latencyP95?: number | null;
	latencyP99?: number | null;
	topClickedProducts?: Array<{ productId: string; title: string; clicks: number }>;
	ctrTrend?: Array<{ date: string; ctr: number }>;
}

interface CtrData {
	trend?: Array<{ date: string; ctr: number }>;
}

interface ExportAnalyticsDialogProps {
	totalSearches: number;
	impressionsCount: number;
	zeroResultQueries: FailedQueryEntry[];
	totalQueryCount: number;
	topQueriesData: TopQueryEntry[];
	analyticsData: AnalyticsData | null;
	ctrTrendData: CtrData | null;
	period: string;
	hasAnyData: boolean;
	trigger?: React.ReactNode;
}

// ─── Section definitions ────────────────────────────────────────────────────

type SectionId = "overview" | "topQueries" | "failed" | "latency" | "ctr" | "clicked";

interface SectionDef {
	id: SectionId;
	labelKey: string;
	defaultChecked: boolean;
}

const SECTIONS: SectionDef[] = [
	{ id: "overview", labelKey: "search.analytics.exportSectionOverview", defaultChecked: true },
	{ id: "topQueries", labelKey: "search.analytics.exportSectionQueries", defaultChecked: true },
	{ id: "failed", labelKey: "search.analytics.exportSectionFailed", defaultChecked: true },
	{ id: "latency", labelKey: "search.analytics.exportSectionLatency", defaultChecked: false },
	{ id: "ctr", labelKey: "search.analytics.exportSectionCTR", defaultChecked: false },
	{ id: "clicked", labelKey: "search.analytics.exportSectionClicked", defaultChecked: false },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function ExportAnalyticsDialog({
	totalSearches,
	impressionsCount,
	zeroResultQueries,
	totalQueryCount,
	topQueriesData,
	analyticsData,
	ctrTrendData,
	period,
	hasAnyData,
	trigger,
}: ExportAnalyticsDialogProps) {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<Set<SectionId>>(
		new Set(SECTIONS.filter((s) => s.defaultChecked).map((s) => s.id)),
	);

	const toggle = (id: SectionId) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const generateCSV = useCallback(() => {
		const parts: string[] = [];

		// ── Helper: escape CSV value ──────────────────────────────────
		const esc = (v: string | number | null | undefined): string => {
			const s = String(v ?? "");
			if (s.includes(",") || s.includes('"') || s.includes("\n")) {
				return `"${s.replace(/"/g, '""')}"`;
			}
			return s;
		};

		// ── Helper: section separator ─────────────────────────────────
		const section = (name: string) => {
			parts.push(`\n--- ${name} ---`);
		};

		// ── Section: Overview KPIs ────────────────────────────────────
		if (selected.has("overview")) {
			section(t("search.analytics.exportSectionOverview"));
			parts.push(`${esc(t("search.analytics.totalSearches"))},${esc(totalSearches)}`);
			parts.push(`${esc(t("search.analytics.impressions"))},${esc(impressionsCount)}`);

			if (analyticsData?.searchesOverTime?.length) {
				parts.push("\n");
				parts.push(`${esc(t("search.analytics.searchesOverTime"))}`);
				parts.push(
					`${esc(t("search.analytics.dateColumn"))},${esc(t("search.analytics.countColumn"))}`,
				);
				for (const d of analyticsData.searchesOverTime) {
					parts.push(`${esc(d.date)},${esc(d.count)}`);
				}
			}
		}

		// ── Section: Top Queries ───────────────────────────────────────
		if (selected.has("topQueries") && topQueriesData.length > 0) {
			section(t("search.analytics.exportSectionQueries"));
			parts.push(
				[
					esc(t("search.analytics.rankColumn")),
					esc(t("search.analytics.queryColumn")),
					esc(t("search.analytics.countColumn")),
					esc(t("search.analytics.percentColumn")),
				].join(","),
			);
			topQueriesData.forEach((row, index) => {
				const count = Number(row.count);
				const percent =
					totalQueryCount > 0 ? ((count / totalQueryCount) * 100).toFixed(1) : "0.0";
				parts.push(
					`${esc(index + 1)},${esc(row.query)},${esc(count)},${esc(`${percent}%`)}`,
				);
			});
		}

		// ── Section: Failed / Zero-Result Queries ─────────────────────
		if (selected.has("failed") && zeroResultQueries.length > 0) {
			section(t("search.analytics.exportSectionFailed"));
			parts.push(
				[
					esc(t("search.analytics.rankColumn")),
					esc(t("search.analytics.queryColumn")),
					esc(t("search.analytics.countColumn")),
					esc(t("search.analytics.percentColumn")),
				].join(","),
			);
			const totalFailed = zeroResultQueries.reduce((sum, q) => sum + q.count, 0);
			zeroResultQueries.forEach((row, index) => {
				const percent =
					totalFailed > 0 ? ((row.count / totalFailed) * 100).toFixed(1) : "0.0";
				parts.push(
					`${esc(index + 1)},${esc(row.query)},${esc(row.count)},${esc(`${percent}%`)}`,
				);
			});
		}

		// ── Section: Latency ───────────────────────────────────────────
		if (selected.has("latency")) {
			section(t("search.analytics.exportSectionLatency"));
			parts.push(
				[
					esc(t("search.analytics.latencyP50")),
					esc(t("search.analytics.latencyP95")),
					esc(t("search.analytics.latencyP99")),
				].join(","),
			);
			parts.push(
				[
					esc(analyticsData?.latencyP50 ?? "—"),
					esc(analyticsData?.latencyP95 ?? "—"),
					esc(analyticsData?.latencyP99 ?? "—"),
				].join(","),
			);
		}

		// ── Section: CTR ──────────────────────────────────────────────
		if (selected.has("ctr") && ctrTrendData?.trend?.length) {
			section(t("search.analytics.exportSectionCTR"));
			parts.push(
				[esc(t("search.analytics.dateColumn")), esc(t("search.analytics.ctrColumn"))].join(
					",",
				),
			);
			for (const d of ctrTrendData.trend) {
				parts.push(`${esc(d.date)},${esc(d.ctr)}`);
			}
		}

		// ── Section: Top Clicked Products ─────────────────────────────
		if (selected.has("clicked") && analyticsData?.topClickedProducts?.length) {
			section(t("search.analytics.exportSectionClicked"));
			parts.push(
				[
					esc(t("search.analytics.rankColumn")),
					esc(t("search.analytics.productColumn")),
					esc(t("search.analytics.clicksColumn")),
				].join(","),
			);
			analyticsData.topClickedProducts.forEach((row, index) => {
				parts.push(`${esc(index + 1)},${esc(row.title)},${esc(row.clicks)}`);
			});
		}

		return parts.join("\n");
	}, [
		selected,
		t,
		totalSearches,
		impressionsCount,
		analyticsData,
		topQueriesData,
		totalQueryCount,
		zeroResultQueries,
		ctrTrendData,
	]);

	const handleExport = useCallback(() => {
		if (selected.size === 0) {
			toast.error(t("search.analytics.exportNoSelection"));
			return;
		}

		const csv = generateCSV();
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `analytics-${period}-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		setOpen(false);
		toast.success(t("search.analytics.exportSuccess"));
	}, [selected, generateCSV, period, t]);

	const numSelected = selected.size;

	if (!hasAnyData) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<DialogTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								aria-label={t("search.analytics.exportReport")}
							>
								<svg
									className="mr-1.5 size-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="7 10 12 15 17 10" />
									<line x1="12" y1="15" x2="12" y2="3" />
								</svg>
								{t("search.analytics.exportReport")}
							</Button>
						</DialogTrigger>
					</TooltipTrigger>
					<TooltipContent>{t("search.analytics.exportReportTooltip")}</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("search.analytics.exportDialogTitle")}</DialogTitle>
					<DialogDescription>
						{t("search.analytics.exportDialogDescription")}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{/* Period badge */}
					<div className="gap-2 flex items-center">
						<span className="text-xs text-foreground/60">
							{t("search.analytics.exportPeriod")}
						</span>
						<Badge status="info" className="text-xs uppercase">
							{period}
						</Badge>
					</div>

					{/* Section checkboxes */}
					<div className="space-y-3">
						{SECTIONS.map((section) => {
							const hasData =
								(section.id === "topQueries" && topQueriesData.length > 0) ||
								(section.id === "failed" && zeroResultQueries.length > 0) ||
								(section.id === "latency" &&
									(analyticsData?.latencyP50 != null ||
										analyticsData?.latencyP95 != null)) ||
								(section.id === "ctr" && (ctrTrendData?.trend?.length ?? 0) > 0) ||
								(section.id === "clicked" &&
									(analyticsData?.topClickedProducts?.length ?? 0) > 0) ||
								section.id === "overview";

							return (
								<label
									key={section.id}
									className={`gap-3 flex cursor-pointer items-center ${
										!hasData ? "opacity-40" : ""
									}`}
								>
									<Checkbox
										checked={selected.has(section.id)}
										onCheckedChange={() => toggle(section.id)}
										disabled={!hasData}
									/>
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium">
											{t(section.labelKey)}
										</div>
									</div>
									{!hasData && (
										<Badge status="info" className="text-[10px]">
											{t("search.analytics.exportNoData")}
										</Badge>
									)}
								</label>
							);
						})}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" size="sm" onClick={() => setOpen(false)}>
						{t("search.analytics.exportCancel")}
					</Button>
					<Button size="sm" onClick={handleExport} disabled={numSelected === 0}>
						<svg
							className="mr-1.5 size-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="7 10 12 15 17 10" />
							<line x1="12" y1="15" x2="12" y2="3" />
						</svg>
						{t("search.analytics.exportDownload", { count: numSelected })}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
