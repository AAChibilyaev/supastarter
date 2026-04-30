"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface SyncJob {
	id: string;
	type: "full" | "delta";
	status: "running" | "completed" | "failed";
	indexId?: string;
	organizationId?: string;
	startedAt: string;
	finishedAt: string | null;
	duration: string | null;
	itemsCount: number;
	failuresCount: number;
	events: Array<{
		timestamp: string;
		message: string;
		level: "info" | "warn" | "error";
	}>;
}

interface SyncJobsTableProps {
	jobs: SyncJob[];
	isLoading?: boolean;
	onRetry?: (jobId: string) => void;
	retryingJobId?: string | null;
}

const statusBadgeMap: Record<string, "warning" | "info" | "success" | "error"> = {
	running: "warning",
	completed: "success",
	failed: "error",
};

export function SyncJobsTable({ jobs, isLoading, onRetry, retryingJobId }: SyncJobsTableProps) {
	const t = useTranslations();
	const [selectedJob, setSelectedJob] = useState<SyncJob | null>(null);

	if (isLoading) {
		return (
			<div className="p-6 rounded-lg border">
				<div className="text-foreground/60">{t("search.loading")}</div>
			</div>
		);
	}

	if (!jobs || jobs.length === 0) {
		return null;
	}

	return (
		<div className="rounded-lg border">
			<details className="group">
				<summary className="gap-2 px-6 py-4 font-medium text-sm flex cursor-pointer items-center hover:bg-muted/50">
					<span className="transition-transform group-open:rotate-90">▶</span>
					{t("search.connector.syncJobs")} ({jobs.length})
				</summary>
				<div className="overflow-x-auto border-t">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("search.connector.jobId")}</TableHead>
								<TableHead>{t("search.connector.jobType")}</TableHead>
								<TableHead>{t("search.connector.jobStatus")}</TableHead>
								<TableHead>{t("search.connector.jobStarted")}</TableHead>
								<TableHead>{t("search.connector.jobDuration")}</TableHead>
								<TableHead>{t("search.connector.jobItems")}</TableHead>
								{onRetry && (
									<TableHead>{t("search.connector.jobActions")}</TableHead>
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{jobs.map((job) => (
								<TableRow
									key={job.id}
									className="cursor-pointer hover:bg-muted/50"
									onClick={() => setSelectedJob(job)}
								>
									<TableCell className="font-mono text-xs max-w-[160px] truncate">
										{job.id}
									</TableCell>
									<TableCell className="text-xs capitalize">{job.type}</TableCell>
									<TableCell>
										<Badge status={statusBadgeMap[job.status] ?? "info"}>
											{job.status}
										</Badge>
									</TableCell>
									<TableCell className="text-xs whitespace-nowrap">
										{new Date(job.startedAt).toLocaleString()}
									</TableCell>
									<TableCell className="text-xs">{job.duration ?? "—"}</TableCell>
									<TableCell className="text-xs">
										{job.itemsCount}
										{job.failuresCount > 0 && (
											<span className="ml-1 text-destructive">
												({job.failuresCount} failures)
											</span>
										)}
									</TableCell>
									{onRetry && (
										<TableCell>
											{job.status === "failed" ? (
												<Button
													variant="outline"
													size="sm"
													loading={retryingJobId === job.id}
													onClick={(e) => {
														e.stopPropagation();
														onRetry(job.id);
													}}
												>
													{t("search.connector.jobRetry")}
												</Button>
											) : (
												<span className="text-xs text-muted-foreground">
													—
												</span>
											)}
										</TableCell>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</details>

			{/* Job detail drawer */}
			<Sheet
				open={!!selectedJob}
				onOpenChange={(open) => {
					if (!open) setSelectedJob(null);
				}}
			>
				<SheetContent className="sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>{t("search.connector.jobDetail")}</SheetTitle>
						<SheetDescription>
							{t("search.connector.jobId")}: {selectedJob?.id}
						</SheetDescription>
					</SheetHeader>

					{selectedJob && (
						<div className="mt-6 space-y-4">
							<div className="gap-3 grid grid-cols-2">
								<div>
									<span className="text-xs text-muted-foreground">
										{t("search.connector.jobType")}
									</span>
									<p className="text-sm font-medium capitalize">
										{selectedJob.type}
									</p>
								</div>
								<div>
									<span className="text-xs text-muted-foreground">
										{t("search.connector.jobStatus")}
									</span>
									<p className="text-sm font-medium">
										<Badge
											status={statusBadgeMap[selectedJob.status] ?? "info"}
										>
											{selectedJob.status}
										</Badge>
									</p>
								</div>
								<div>
									<span className="text-xs text-muted-foreground">
										{t("search.connector.jobStarted")}
									</span>
									<p className="text-sm font-medium">
										{new Date(selectedJob.startedAt).toLocaleString()}
									</p>
								</div>
								<div>
									<span className="text-xs text-muted-foreground">
										{t("search.connector.jobDuration")}
									</span>
									<p className="text-sm font-medium">
										{selectedJob.duration ?? "—"}
									</p>
								</div>
								<div>
									<span className="text-xs text-muted-foreground">
										{t("search.connector.jobItems")}
									</span>
									<p className="text-sm font-medium">{selectedJob.itemsCount}</p>
								</div>
								<div>
									<span className="text-xs text-muted-foreground">Failures</span>
									<p className="text-sm font-medium">
										{selectedJob.failuresCount}
									</p>
								</div>
							</div>

							{/* Event log */}
							<div>
								<span className="text-xs mb-2 block text-muted-foreground">
									Event log
								</span>
								<div className="space-y-1 rounded p-3 max-h-[300px] overflow-y-auto bg-muted">
									{selectedJob.events.length === 0 ? (
										<span className="text-xs text-muted-foreground">
											No events
										</span>
									) : (
										selectedJob.events.map((event, i) => (
											<div key={i} className="gap-2 text-xs flex items-start">
												<span className="font-mono whitespace-nowrap text-muted-foreground">
													{new Date(event.timestamp).toLocaleTimeString()}
												</span>
												<span
													className={
														event.level === "error"
															? "text-rose-500"
															: event.level === "warn"
																? "text-amber-500"
																: ""
													}
												>
													{event.message}
												</span>
											</div>
										))
									)}
								</div>
							</div>

							<div className="pt-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setSelectedJob(null)}
								>
									Close
								</Button>
							</div>
						</div>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}
