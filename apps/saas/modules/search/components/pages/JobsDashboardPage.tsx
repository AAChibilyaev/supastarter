"use client";

import type { ConnectorSyncJobView } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ingestJobStatusBadge } from "../../lib/job-status";
import { EmptyState } from "../cards/EmptyState";
import { ImportJobsPanel } from "../panels/ImportJobsPanel";
import { SyncJobsTable } from "../tables/SyncJobsTable";

// ─── Types ──────────────────────────────────────────────────────────────────

type JobType = "import" | "sync" | "reindex";

interface UnifiedJob {
	id: string;
	jobType: JobType;
	indexSlug: string;
	status: string;
	startedAt: string;
	finishedAt: string | null;
	itemsCount: number;
	failuresCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(startedAt: string, finishedAt: string | null): string {
	if (!finishedAt) return "—";
	try {
		const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
		return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
	} catch {
		return "—";
	}
}

function formatTime(iso: string | undefined | null): string {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return "—";
	}
}

type BadgeStatus = "warning" | "info" | "success" | "error";

function unifiedStatusBadge(status: string): BadgeStatus {
	switch (status) {
		case "completed":
			return "success";
		case "failed":
			return "error";
		case "running":
		case "processing":
			return "info";
		case "pending":
		default:
			return "warning";
	}
}

function jobTypeBadgeClass(jobType: JobType): string {
	switch (jobType) {
		case "import":
			return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
		case "sync":
			return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
		case "reindex":
			return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
	}
}

// ─── All Jobs Table ───────────────────────────────────────────────────────────

interface AllJobsTableProps {
	jobs: UnifiedJob[];
	t: ReturnType<typeof useTranslations>;
}

function AllJobsTable({ jobs, t }: AllJobsTableProps) {
	if (jobs.length === 0) {
		return <EmptyState title={t("jobs.emptyState")} description="" icon={BriefcaseIcon} />;
	}

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("jobs.columns.type")}</TableHead>
						<TableHead>{t("jobs.columns.index")}</TableHead>
						<TableHead>{t("jobs.columns.status")}</TableHead>
						<TableHead>{t("jobs.columns.started")}</TableHead>
						<TableHead>{t("jobs.columns.duration")}</TableHead>
						<TableHead>{t("jobs.columns.items")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{jobs.map((job) => (
						<TableRow key={`${job.jobType}-${job.id}`}>
							<TableCell>
								<span
									className={`px-2 py-0.5 text-xs font-medium inline-flex items-center rounded-full ${jobTypeBadgeClass(job.jobType)}`}
								>
									{t(`jobs.${job.jobType}` as never)}
								</span>
							</TableCell>
							<TableCell className="font-mono text-xs">{job.indexSlug}</TableCell>
							<TableCell>
								<Badge status={unifiedStatusBadge(job.status)}>{job.status}</Badge>
							</TableCell>
							<TableCell className="text-xs whitespace-nowrap">
								{formatTime(job.startedAt)}
							</TableCell>
							<TableCell className="text-xs font-mono">
								{formatDuration(job.startedAt, job.finishedAt)}
							</TableCell>
							<TableCell className="text-xs">
								{job.itemsCount}
								{job.failuresCount > 0 && (
									<span className="ml-1 text-destructive">
										({job.failuresCount} {t("jobs.columns.failures")})
									</span>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

// ─── JobsDashboardPage ────────────────────────────────────────────────────────

interface JobsDashboardPageProps {
	organizationId: string;
}

export function JobsDashboardPage({ organizationId }: JobsDashboardPageProps) {
	const t = useTranslations("search");

	// Import jobs
	const { data: importData, isLoading: importLoading } = useQuery(
		orpc.search.importJobs.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	// Sync jobs
	const { data: syncJobsRaw, isLoading: syncLoading } = useQuery(
		orpc.search.listConnectorSyncJobs.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	// Reindex jobs (via pipelineStatus active reindex jobs)
	const { data: pipelineData, isLoading: reindexLoading } = useQuery(
		orpc.search.pipelineStatus.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	const isLoading = importLoading || syncLoading || reindexLoading;

	// Build unified jobs list
	const unifiedJobs: UnifiedJob[] = [];

	// Import jobs
	for (const job of importData?.jobs ?? []) {
		unifiedJobs.push({
			id: job.id,
			jobType: "import",
			indexSlug: job.type ?? "—",
			status: job.status,
			startedAt: job.startedAt,
			finishedAt: job.finishedAt,
			itemsCount: job.processedItems,
			failuresCount:
				job.totalItems - job.processedItems > 0 && job.status === "failed"
					? job.totalItems - job.processedItems
					: 0,
		});
	}

	// Sync jobs — ConnectorSyncJobView has indexId, not slug directly
	const syncJobs: ConnectorSyncJobView[] = syncJobsRaw ?? [];
	for (const job of syncJobs) {
		unifiedJobs.push({
			id: job.id,
			jobType: "sync",
			indexSlug: job.indexId,
			status: job.status,
			startedAt: job.startedAt,
			finishedAt: job.finishedAt,
			itemsCount: job.itemsCount,
			failuresCount: job.failuresCount,
		});
	}

	// Active reindex jobs from pipeline status
	for (const job of pipelineData?.activeReindexJobs ?? []) {
		unifiedJobs.push({
			id: job.jobId,
			jobType: "reindex",
			indexSlug: job.slug,
			status: "running",
			startedAt: job.startedAt,
			finishedAt: null,
			itemsCount: job.processed,
			failuresCount: 0,
		});
	}

	// Sort by startedAt desc
	unifiedJobs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

	return (
		<div className="space-y-6">
			<Tabs defaultValue="all">
				<TabsList>
					<TabsTrigger value="all">{t("jobs.allJobs")}</TabsTrigger>
					<TabsTrigger value="import">{t("jobs.import")}</TabsTrigger>
					<TabsTrigger value="sync">{t("jobs.sync")}</TabsTrigger>
					<TabsTrigger value="reindex">{t("jobs.reindex")}</TabsTrigger>
				</TabsList>

				<TabsContent value="all" className="mt-4">
					<Card>
						<CardContent className="p-0">
							{isLoading ? (
								<div className="p-6 text-sm text-foreground/60">{t("loading")}</div>
							) : (
								<AllJobsTable jobs={unifiedJobs} t={t} />
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="import" className="mt-4">
					<ImportJobsPanel organizationId={organizationId} />
				</TabsContent>

				<TabsContent value="sync" className="mt-4">
					<Card>
						<CardContent className="p-0">
							{syncLoading ? (
								<div className="p-6 text-sm text-foreground/60">{t("loading")}</div>
							) : syncJobs.length === 0 ? (
								<div className="p-6">
									<EmptyState
										title={t("jobs.emptyState")}
										description=""
										icon={BriefcaseIcon}
									/>
								</div>
							) : (
								<SyncJobsTable jobs={syncJobs} isLoading={syncLoading} />
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="reindex" className="mt-4">
					<Card>
						<CardContent className="p-0">
							{reindexLoading ? (
								<div className="p-6 text-sm text-foreground/60">{t("loading")}</div>
							) : (pipelineData?.activeReindexJobs ?? []).length === 0 ? (
								<div className="p-6">
									<EmptyState
										title={t("jobs.emptyState")}
										description=""
										icon={BriefcaseIcon}
									/>
								</div>
							) : (
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>{t("jobs.columns.index")}</TableHead>
												<TableHead>{t("jobs.columns.status")}</TableHead>
												<TableHead>{t("jobs.columns.started")}</TableHead>
												<TableHead>{t("jobs.columns.progress")}</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{(pipelineData?.activeReindexJobs ?? []).map((job) => (
												<TableRow key={job.jobId}>
													<TableCell className="font-mono text-xs">
														{job.slug}
													</TableCell>
													<TableCell>
														<Badge
															status={
																ingestJobStatusBadge[
																	"processing"
																] ?? "info"
															}
														>
															running
														</Badge>
													</TableCell>
													<TableCell className="text-xs whitespace-nowrap">
														{formatTime(job.startedAt)}
													</TableCell>
													<TableCell className="text-xs">
														{job.processed}/{job.total}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
