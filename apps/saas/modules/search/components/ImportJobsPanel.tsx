"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	ClockIcon,
	ListIcon,
	Loader2,
	RotateCw,
	XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "./EmptyState";

interface ImportJobsPanelProps {
	organizationId: string;
	slug?: string;
}

type ViewMode = "timeline" | "table";

const statusBadgeMap: Record<string, "warning" | "info" | "success" | "error"> = {
	pending: "warning",
	processing: "info",
	completed: "success",
	failed: "error",
};

function formatDuration(startedAt: string, finishedAt: string | null): string {
	if (!finishedAt) return "\u2014";
	try {
		const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
		return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
	} catch {
		return "\u2014";
	}
}

function formatTime(iso: string | undefined | null): string {
	if (!iso) return "\u2014";
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return "\u2014";
	}
}

function getStatusIcon(status: string) {
	switch (status) {
		case "completed":
			return CheckCircle2;
		case "failed":
			return XCircle;
		case "processing":
			return Loader2;
		case "pending":
			return ClockIcon;
		default:
			return ClockIcon;
	}
}

function getStatusColor(status: string): string {
	switch (status) {
		case "completed":
			return "text-emerald-500";
		case "failed":
			return "text-rose-500";
		case "processing":
			return "text-blue-500";
		case "pending":
			return "text-amber-500";
		default:
			return "text-muted-foreground";
	}
}

export function ImportJobsPanel({ organizationId, slug }: ImportJobsPanelProps) {
	const t = useTranslations();
	const [view, setView] = useState<ViewMode>("timeline");
	const [retryOpen, setRetryOpen] = useState(false);

	const { data, isLoading } = useQuery(
		orpc.search.importJobs.queryOptions({
			input: { organizationId, indexSlug: slug },
			enabled: !!organizationId,
		}),
	);

	const jobs = data?.jobs ?? [];
	const summary = data?.summary;

	if (isLoading) {
		return (
			<Card className="p-6 space-y-4">
				<div className="text-foreground/60">{t("search.loading")}</div>
			</Card>
		);
	}

	const succeededCount = summary?.completed ?? 0;
	const failedCount = summary?.failed ?? 0;
	const pendingCount = summary ? summary.pending + summary.processing : 0;
	const totalCount = summary?.total ?? succeededCount + failedCount + pendingCount;
	const successRate = totalCount > 0 ? Math.round((succeededCount / totalCount) * 100) : 0;

	const retryJobs = jobs.filter((j) => j.status === "failed" || j.status === "pending");

	return (
		<Card className="p-6 space-y-6">
			<div className="sm:flex-row sm:items-center sm:justify-between gap-4 flex flex-col">
				<div>
					<h3 className="text-lg font-semibold">{t("search.importJobs.title")}</h3>
					<p className="text-sm text-foreground/60">
						{t("search.importJobs.description")}
					</p>
				</div>
				<div className="gap-1 p-0.5 flex items-center self-start rounded-lg bg-muted">
					<Button
						variant={view === "timeline" ? "primary" : "ghost"}
						size="sm"
						onClick={() => setView("timeline")}
					>
						{t("search.importJobs.viewTimeline")}
					</Button>
					<Button
						variant={view === "table" ? "primary" : "ghost"}
						size="sm"
						onClick={() => setView("table")}
					>
						{t("search.importJobs.viewTable")}
					</Button>
				</div>
			</div>

			{/* Statistics bar */}
			<div className="p-4 space-y-3 rounded-lg border">
				<div className="text-sm flex items-center justify-between">
					<span className="text-foreground/60">{t("search.importJobs.successRate")}</span>
					<span className="font-semibold text-emerald-500">{successRate}%</span>
				</div>
				<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
					<div
						className="bg-emerald-500 h-full rounded-full transition-all duration-500"
						style={{ width: `${successRate}%` }}
					/>
				</div>
				<div className="gap-4 text-sm flex flex-wrap">
					<div className="gap-1.5 flex items-center">
						<span className="size-2 bg-emerald-500 rounded-full" />
						<span>
							<strong>{succeededCount}</strong>{" "}
							<span className="text-foreground/60">
								{t("search.importJobs.completed")}
							</span>
						</span>
					</div>
					<div className="gap-1.5 flex items-center">
						<span className="size-2 bg-rose-500 rounded-full" />
						<span>
							<strong>{failedCount}</strong>{" "}
							<span className="text-foreground/60">
								{t("search.importJobs.failed")}
							</span>
						</span>
					</div>
					<div className="gap-1.5 flex items-center">
						<span className="size-2 bg-amber-500 rounded-full" />
						<span>
							<strong>{pendingCount}</strong>{" "}
							<span className="text-foreground/60">
								{t("search.importJobs.pending")}
							</span>
						</span>
					</div>
				</div>
			</div>

			{/* Retry queue section */}
			{retryJobs.length > 0 && (
				<div className="rounded-lg border">
					<button
						type="button"
						className="px-4 py-3 text-sm font-medium flex w-full items-center justify-between transition-colors hover:bg-muted/50"
						onClick={() => setRetryOpen(!retryOpen)}
					>
						<span className="gap-2 flex items-center">
							{t("search.importJobs.retryQueue")}
							<Badge status="warning">{retryJobs.length}</Badge>
						</span>
						{retryOpen ? (
							<ChevronDown className="size-4 text-muted-foreground" />
						) : (
							<ChevronRight className="size-4 text-muted-foreground" />
						)}
					</button>
					{retryOpen && (
						<div className="px-4 py-3 space-y-3 border-t">
							{retryJobs.map((job) => {
								const retryTime =
									job.status === "failed"
										? new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString()
										: null;
								return (
									<div
										key={job.id}
										className="sm:flex-row sm:items-center gap-2 p-3 text-sm flex flex-col justify-between rounded-md bg-muted/30"
									>
										<div className="gap-2 min-w-0 flex items-center">
											<XCircle className="size-4 text-rose-500 shrink-0" />
											<span className="font-mono text-xs truncate">
												{job.id}
											</span>
											{job.type && <Badge status="info">{job.type}</Badge>}
										</div>
										<div className="gap-3 text-xs flex items-center text-foreground/60">
											{retryTime && (
												<span>
													{t("search.importJobs.nextRetry")}: {retryTime}
												</span>
											)}
											{job.errorMessage && (
												<span
													className="max-w-[200px] truncate"
													title={job.errorMessage}
												>
													{job.errorMessage}
												</span>
											)}
										</div>
									</div>
								);
							})}
							<div className="gap-2 pt-1 flex">
								<Button variant="primary" size="sm">
									<RotateCw className="size-3.5" />
									{t("search.importJobs.retryAll")}
								</Button>
								<Button variant="ghost" size="sm">
									{t("search.importJobs.clearQueue")}
								</Button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Content area */}
			{!jobs || jobs.length === 0 ? (
				<EmptyState
					title={t("search.importJobs.empty")}
					description={t("search.importJobs.emptyDescription")}
					icon={ListIcon}
				/>
			) : view === "timeline" ? (
				/* Timeline view */
				<div className="space-y-3">
					{jobs.map((job) => {
						const EvIcon = getStatusIcon(job.status);
						const failedItems =
							job.status === "failed" && job.totalItems > 0
								? job.totalItems - job.processedItems
								: 0;

						return (
							<div key={job.id} className="p-4 space-y-3 rounded-lg border">
								{/* Job header */}
								<div className="sm:flex-row sm:items-center gap-2 flex flex-col justify-between">
									<div className="gap-2 min-w-0 flex items-center">
										<EvIcon
											className={`size-4 shrink-0 ${getStatusColor(job.status)}`}
										/>
										<span className="font-mono text-xs truncate">{job.id}</span>
										<Badge status={statusBadgeMap[job.status] ?? "info"}>
											{job.status}
										</Badge>
										{job.type && (
											<span className="text-xs sm:inline hidden text-muted-foreground">
												{job.type}
											</span>
										)}
									</div>
									<div className="gap-3 text-xs flex items-center text-foreground/60">
										<span>{formatTime(job.startedAt)}</span>
										<span className="font-mono">
											{formatDuration(job.startedAt, job.finishedAt)}
										</span>
									</div>
								</div>

								{/* Progress row */}
								{job.totalItems > 0 && (
									<div className="gap-4 text-xs flex items-center text-foreground/60">
										<span>
											{t("search.importJobs.tableProgress")}:{" "}
											<span className="font-semibold text-emerald-500">
												{job.processedItems}
											</span>
											/{job.totalItems}
										</span>
										{failedItems > 0 && (
											<span>
												{t("search.importJobs.failed")}:{" "}
												<span className="font-semibold text-rose-500">
													{failedItems}
												</span>
											</span>
										)}
									</div>
								)}

								{/* Error message */}
								{job.errorMessage && (
									<div className="gap-2 text-xs bg-rose-500/5 p-2 flex items-start rounded-md">
										<XCircle className="mt-0.5 size-3.5 text-rose-500 shrink-0" />
										<span className="text-rose-600 dark:text-rose-400">
											{job.errorMessage}
										</span>
									</div>
								)}
							</div>
						);
					})}
				</div>
			) : (
				/* Table view */
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("search.importJobs.tableJobId")}</TableHead>
								<TableHead>{t("search.importJobs.tableType")}</TableHead>
								<TableHead>{t("search.importJobs.tableStatus")}</TableHead>
								<TableHead>{t("search.importJobs.tableProgress")}</TableHead>
								<TableHead>{t("search.importJobs.tableErrors")}</TableHead>
								<TableHead>{t("search.importJobs.tableTime")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{jobs.map((job) => (
								<TableRow key={job.id}>
									<TableCell className="font-mono text-xs max-w-[200px] truncate">
										{job.id}
									</TableCell>
									<TableCell className="text-xs">{job.type}</TableCell>
									<TableCell>
										<Badge status={statusBadgeMap[job.status] ?? "info"}>
											{job.status}
										</Badge>
									</TableCell>
									<TableCell className="text-xs">
										{job.processedItems}/{job.totalItems}
									</TableCell>
									<TableCell className="text-xs max-w-[150px] truncate">
										{job.errorMessage ?? "\u2014"}
									</TableCell>
									<TableCell className="text-xs whitespace-nowrap">
										{formatTime(job.startedAt)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</Card>
	);
}
