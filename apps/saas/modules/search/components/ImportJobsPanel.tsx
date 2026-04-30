"use client";

import { Badge } from "@repo/ui/components/badge";
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
import { ListIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "./EmptyState";

interface ImportJobsPanelProps {
	organizationId: string;
	slug?: string;
}

const statusBadgeMap: Record<string, "warning" | "info" | "success" | "error"> = {
	pending: "warning",
	processing: "info",
	completed: "success",
	failed: "error",
};

export function ImportJobsPanel({ organizationId, slug }: ImportJobsPanelProps) {
	const t = useTranslations();

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

	return (
		<Card className="p-6 space-y-4">
			<div>
				<h3 className="text-lg font-semibold">{t("search.importJobs.title")}</h3>
				<p className="text-sm text-foreground/60">{t("search.importJobs.description")}</p>
			</div>

			{summary && (
				<div className="gap-4 grid grid-cols-4">
					<div className="p-3 rounded border text-center">
						<div className="text-2xl font-bold">{summary.pending}</div>
						<div className="text-xs text-foreground/60">
							{t("search.importJobs.pending")}
						</div>
					</div>
					<div className="p-3 rounded border text-center">
						<div className="text-2xl font-bold">{summary.processing}</div>
						<div className="text-xs text-foreground/60">
							{t("search.importJobs.processing")}
						</div>
					</div>
					<div className="p-3 rounded border text-center">
						<div className="text-2xl font-bold">{summary.completed}</div>
						<div className="text-xs text-foreground/60">
							{t("search.importJobs.completed")}
						</div>
					</div>
					<div className="p-3 rounded border text-center">
						<div className="text-2xl font-bold">{summary.failed}</div>
						<div className="text-xs text-foreground/60">
							{t("search.importJobs.failed")}
						</div>
					</div>
				</div>
			)}

			{!jobs || jobs.length === 0 ? (
				<EmptyState
					title={t("search.importJobs.empty")}
					description={t("search.importJobs.emptyDescription")}
					icon={ListIcon}
				/>
			) : (
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
										{job.errorMessage ?? "—"}
									</TableCell>
									<TableCell className="text-xs whitespace-nowrap">
										{new Date(job.startedAt).toLocaleString()}
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
