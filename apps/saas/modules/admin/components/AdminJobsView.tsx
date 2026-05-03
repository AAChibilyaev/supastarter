"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { ClockIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function AdminJobsView() {
	const t = useTranslations("admin");
	const { data, isLoading, isError } = useQuery(orpc.admin.jobs.queryOptions({ input: {} }));

	if (isLoading) return <LoadingSkeleton />;

	if (isError || !data) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-sm text-destructive">{t("jobs.loadError")}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="gap-6 grid grid-cols-1">
			{/* Cron job definitions */}
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 text-base flex items-center">
						<ClockIcon className="size-4" />
						{t("jobs.backgroundJobs")}
					</CardTitle>
				</CardHeader>
				<CardContent className="gap-3 grid grid-cols-1">
					{data.jobs.map((job) => (
						<Card key={job.path} className="rounded-lg">
							<CardContent className="p-4 flex items-center justify-between">
								<div className="gap-1 grid grid-cols-1">
									<p className="font-medium text-sm">{job.name}</p>
									<p className="font-mono text-xs text-muted-foreground">{job.path}</p>
								</div>
								<div className="gap-3 flex items-center">
									{job.secretPreview && (
										<span className="font-mono text-xs text-muted-foreground">
											{job.secretPreview}
										</span>
									)}
									{job.configured ? (
										<Badge status="success">{t("jobs.ready")}</Badge>
									) : (
										<Badge status="error">{t("jobs.missingSecret")}</Badge>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</CardContent>
			</Card>

			{/* Recent sync job activity */}
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 text-base flex items-center">
						<RefreshCwIcon className="size-4" />
						{t("jobs.recentSyncActivity")}
						<span className="font-normal text-xs ml-auto text-muted-foreground">
							{t("jobs.totalJobs")}: {data.totalSyncJobs}
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{data.recentSyncActivity.length === 0 ? (
						<p className="text-sm text-muted-foreground">{t("jobs.noSyncActivity")}</p>
					) : (
						<div className="gap-2 grid grid-cols-1">
							{data.recentSyncActivity.slice(0, 10).map((sync) => (
								<Card key={sync.id} className="rounded-md">
									<CardContent className="p-3 text-sm flex items-center justify-between">
										<div className="gap-2 flex items-center">
											<Badge
												status={
													sync.status === "completed"
														? "success"
														: sync.status === "failed"
															? "error"
															: "warning"
												}
												className="text-xs"
											>
												{sync.status}
											</Badge>
											<span className="font-medium">{sync.type}</span>
										</div>
										<div className="gap-4 text-xs flex items-center text-muted-foreground">
											<span>{t("jobs.itemsCount", { count: sync.itemsCount })}</span>
											<span>{new Date(sync.startedAt).toLocaleString()}</span>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-6">
			<Skeleton className="h-48" />
			<Skeleton className="h-64" />
		</div>
	);
}
