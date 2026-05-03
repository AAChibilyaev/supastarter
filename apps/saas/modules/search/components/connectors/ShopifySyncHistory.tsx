"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

interface ShopifySyncHistoryProps {
	organizationId: string;
	storeId: string;
}

function getSyncStatusColor(status: string): "success" | "warning" | "error" | "info" {
	switch (status) {
		case "completed":
			return "success";
		case "running":
		case "syncing":
			return "info";
		case "failed":
			return "error";
		default:
			return "warning";
	}
}

function relativeTime(
	dateStr: string | null,
	t: (key: string, values?: Record<string, string | number | Date>) => string,
): string {
	if (!dateStr) return "";
	const ms = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(ms / 60000);
	if (mins < 1) return t("search.connector.time.lessThanMinute");
	if (mins < 60) return t("search.connector.time.minutesAgo", { count: mins });
	const hours = Math.floor(mins / 60);
	if (hours < 24) return t("search.connector.time.hoursAgo", { count: hours });
	const days = Math.floor(hours / 24);
	return t("search.connector.time.daysAgo", { count: days });
}

export function ShopifySyncHistory({ organizationId }: ShopifySyncHistoryProps) {
	const t = useTranslations();
	const tShopify = useTranslations("search.connector.shopify");

	const { data: syncJobs, isLoading } = useQuery(
		orpc.search.listConnectorSyncJobs.queryOptions({
			input: { organizationId },
		}),
	);

	if (isLoading) {
		return (
			<div className="space-y-2">
				{[...Array(3)].map((_, i) => (
					<Skeleton key={i} className="h-14 w-full rounded-lg" />
				))}
			</div>
		);
	}

	if (!syncJobs || syncJobs.length === 0) {
		return (
			<Card>
				<CardContent className="py-8">
					<p className="text-sm text-center text-muted-foreground">{tShopify("noSyncHistory")}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-2">
			{syncJobs.slice(0, 10).map((job: any) => (
				<div
					key={job.id}
					className="gap-3 p-3 flex items-center justify-between rounded-lg border border-border"
				>
					<div className="min-w-0 flex-1">
						<div className="gap-2 flex items-center">
							<p className="text-sm font-medium capitalize">
								{job.type === "full"
									? tShopify("syncFull")
									: job.type === "delta"
										? tShopify("syncDelta")
										: job.type}
							</p>
							<Badge status={getSyncStatusColor(job.status)}>
								{job.status === "completed"
									? tShopify("syncCompleted")
									: job.status === "running"
										? tShopify("syncRunning")
										: job.status === "failed"
											? tShopify("syncFailed")
											: job.status}
							</Badge>
						</div>
						<div className="gap-2 mt-0.5 text-xs flex items-center text-muted-foreground">
							<span>{relativeTime(job.startedAt, t)}</span>
							{job.itemsCount > 0 && (
								<>
									<span>·</span>
									<span>{tShopify("itemsSynced", { count: job.itemsCount })}</span>
								</>
							)}
							{job.failuresCount > 0 && (
								<>
									<span>·</span>
									<span className="text-destructive">
										{tShopify("syncFailures", { count: job.failuresCount })}
									</span>
								</>
							)}
						</div>
						{job.lastError && (
							<p className="mt-0.5 text-xs truncate text-destructive">{job.lastError}</p>
						)}
					</div>
				</div>
			))}
		</div>
	);
}
