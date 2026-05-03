"use client";

import { Badge } from "@repo/ui/components/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
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
import { useQuery } from "@tanstack/react-query";
import { ShoppingCartIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { syncJobStatusBadge } from "../../lib/job-status";

interface ShopifySyncHistoryProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
}

export function ShopifySyncHistory({
	open,
	onOpenChange,
	organizationId,
}: ShopifySyncHistoryProps) {
	const t = useTranslations();

	const { data: allJobs, isLoading } = useQuery(
		orpc.search.listConnectorSyncJobs.queryOptions({
			input: { organizationId },
		}),
	);

	// Filter to Shopify jobs (by indexId containing "shopify")
	const jobs = (allJobs ?? []).filter((job) =>
		job.indexId.toLowerCase().includes("shopify"),
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-2xl overflow-y-auto">
				<SheetHeader>
					<div className="gap-3 flex items-center">
						<div className="size-9 flex shrink-0 items-center justify-center rounded-lg bg-muted">
							<ShoppingCartIcon className="size-4 text-muted-foreground" />
						</div>
						<div>
							<SheetTitle>{t("search.connectors.shopify.syncHistory")}</SheetTitle>
							<SheetDescription className="text-xs">
								{t("search.connector.syncJobsNote")}
							</SheetDescription>
						</div>
					</div>
				</SheetHeader>

				<div className="mt-6">
					{isLoading ? (
						<div className="space-y-2">
							{[0, 1, 2].map((i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : jobs.length === 0 ? (
						<p className="text-sm text-muted-foreground py-4">
							{t("search.connector.noJobLogs")}
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("search.connector.jobType")}</TableHead>
									<TableHead>{t("search.connector.jobStatus")}</TableHead>
									<TableHead>{t("search.connector.jobStarted")}</TableHead>
									<TableHead>{t("search.connector.jobDuration")}</TableHead>
									<TableHead>{t("search.connector.jobItems")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{jobs.map((job) => (
									<TableRow key={job.id}>
										<TableCell className="text-sm capitalize">
											{job.type === "full"
												? t("search.connector.typeFull")
												: t("search.connector.typeDelta")}
										</TableCell>
										<TableCell>
											<Badge status={syncJobStatusBadge[job.status] ?? "info"}>
												{job.status === "completed"
													? t("search.connector.statusCompleted")
													: job.status === "running"
														? t("search.connector.statusRunning")
														: t("search.connector.statusFailed")}
											</Badge>
										</TableCell>
										<TableCell className="text-sm whitespace-nowrap text-muted-foreground">
											{job.startedAt
												? new Date(job.startedAt).toLocaleString()
												: "—"}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{job.duration ?? "—"}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{job.itemsCount}
											{job.failuresCount > 0
												? ` / ${job.failuresCount} ${t("search.connector.jobFailures")}`
												: ""}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
