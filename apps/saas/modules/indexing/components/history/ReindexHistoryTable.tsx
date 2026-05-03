"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Download, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

// ── Types ───────────────────────────────────────────────────────

interface ReindexHistoryTableProps {
	organizationId: string;
	indexSlug: string;
}

const STATUS_BADGE = {
	pending: "warning" as const,
	running: "info" as const,
	completed: "success" as const,
	failed: "error" as const,
};

// ── Main component ───────────────────────────────────────────────

export function ReindexHistoryTable({ organizationId, indexSlug }: ReindexHistoryTableProps) {
	const t = useTranslations("indexing.dashboard");
	const [page, setPage] = useState(0);
	const limit = 20;

	const { data, isLoading } = useQuery(
		orpc.indexing.reindexHistory.queryOptions({
			input: { organizationId, limit, offset: page * limit },
			enabled: Boolean(organizationId),
		}),
	);

	const jobs = data?.jobs?.filter((j) => j.slug === indexSlug) ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	// ── CSV export ────────────────────────────────────────────────

	const handleExportCsv = () => {
		const headers = ["ID", "Status", "Processed", "Total", "Started", "Finished"];
		const rows = jobs.map((j) => [
			j.id,
			j.status,
			String(j.processed),
			String(j.total),
			j.startedAt,
			j.finishedAt ?? "",
		]);

		const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `reindex-history-${indexSlug}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// ── Loading ───────────────────────────────────────────────────

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("indexingProgress")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-3/4" />
				</CardContent>
			</Card>
		);
	}

	// ── Empty state ──────────────────────────────────────────────

	if (jobs.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("indexingProgress")}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="py-8 text-sm text-center text-muted-foreground">{t("noData")}</p>
				</CardContent>
			</Card>
		);
	}

	// ── Render table ─────────────────────────────────────────────

	return (
		<Card>
			<CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
				<CardTitle className="text-base">{t("indexingProgress")}</CardTitle>
				<Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCsv}>
					<Download className="size-3.5" />
					CSV
				</Button>
			</CardHeader>
			<CardContent className="p-0">
				<div className="overflow-x-auto">
					<table className="text-sm w-full">
						<thead>
							<tr className="border-b border-border">
								<th className="px-4 py-3 font-medium text-left text-muted-foreground">Status</th>
								<th className="px-4 py-3 font-medium text-left text-muted-foreground">Progress</th>
								<th className="px-4 py-3 font-medium md:table-cell hidden text-left text-muted-foreground">
									Started
								</th>
								<th className="px-4 py-3 font-medium md:table-cell hidden text-left text-muted-foreground">
									Duration
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{jobs.map((job) => {
								const started = new Date(job.startedAt);
								const finished = job.finishedAt ? new Date(job.finishedAt) : null;
								const duration = finished
									? formatDistanceToNow(started, { addSuffix: false })
									: "\u2014";

								return (
									<tr key={job.id} className="hover:bg-accent/50">
										<td className="px-4 py-3">
											<Badge status={STATUS_BADGE[job.status]}>
												{job.status === "running" && (
													<RefreshCw className="size-3 mr-1 animate-spin inline" />
												)}
												{job.status}
											</Badge>
										</td>
										<td className="px-4 py-3">
											<div className="gap-1.5 flex flex-col">
												<span className="font-medium">
													{job.processed} / {job.total}
												</span>
												{job.total > 0 && (
													<div className="w-32 h-1.5 overflow-hidden rounded-full bg-muted">
														<div
															className="h-full rounded-full bg-primary transition-all"
															style={{
																width: `${Math.round((job.processed / job.total) * 100)}%`,
															}}
														/>
													</div>
												)}
											</div>
										</td>
										<td className="px-4 py-3 md:table-cell hidden text-muted-foreground">
											{formatDistanceToNow(started, { addSuffix: true })}
										</td>
										<td className="px-4 py-3 md:table-cell hidden text-muted-foreground">
											{duration}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="gap-2 px-4 py-3 flex items-center justify-between border-t border-border">
						<span className="text-xs text-muted-foreground">
							Page {page + 1} of {totalPages}
						</span>
						<div className="gap-1 flex">
							<Button
								variant="outline"
								size="sm"
								disabled={page === 0}
								onClick={() => setPage((p) => Math.max(0, p - 1))}
							>
								Prev
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={page >= totalPages - 1}
								onClick={() => setPage((p) => p + 1)}
							>
								Next
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
