"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import { Skeleton } from "@repo/ui/components/skeleton";
import { EmptyState } from "@search/components/cards/EmptyState";
import { PageHeader } from "@shared/components/PageHeader";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	ActivityIcon,
	AlertCircleIcon,
	AlertTriangleIcon,
	CheckCircle2Icon,
	CpuIcon,
	DatabaseIcon,
	HardDriveIcon,
	RefreshCwIcon,
	SearchIcon,
	WifiIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface IndexHealthPageProps {
	organizationId: string;
	orgSlug: string;
}

function formatBytes(bytes: string | number): string {
	const n = typeof bytes === "string" ? Number(bytes) : bytes;
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
	return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function timeAgo(iso: string | null): string {
	if (!iso) return "—";
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export function IndexHealthPage({ organizationId, orgSlug }: IndexHealthPageProps) {
	const t = useTranslations("search");

	// Per-index health — poll every 30s
	const { data: healthData, isLoading: healthLoading } = useQuery({
		...orpc.search.indexHealth.queryOptions({
			input: { organizationId },
		}),
		enabled: Boolean(organizationId),
		refetchInterval: 30_000,
	});

	// Cluster metrics — poll every 60s
	const { data: clusterData, isLoading: clusterLoading } = useQuery({
		...orpc.search.clusterOps.metrics.queryOptions({
			input: { organizationId },
		}),
		enabled: Boolean(organizationId),
		refetchInterval: 60_000,
	});

	const { data: apiStats } = useQuery({
		...orpc.search.clusterOps.apiStats.queryOptions({
			input: { organizationId },
		}),
		enabled: Boolean(organizationId),
		refetchInterval: 60_000,
	});

	const indexes = healthData?.indexes ?? [];
	const summary = healthData?.summary;

	// ── Summary badges ───────────────────────────────────────────────
	const statusIcon = (status: string, className = "size-4") => {
		switch (status) {
			case "healthy":
				return <CheckCircle2Icon className={`${className} text-success`} />;
			case "warning":
				return <AlertTriangleIcon className={`${className} text-warning`} />;
			case "critical":
				return <AlertCircleIcon className={`${className} text-destructive`} />;
			default:
				return <ActivityIcon className={`${className} text-muted-foreground`} />;
		}
	};

	if (healthLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-64" />
				<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid grid-cols-2">
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
				</div>
				<div className="gap-4 lg:grid-cols-2 xl:grid-cols-3 grid">
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader title={t("indexHealth.title")} subtitle={t("indexHealth.subtitle")} />

			{/* Summary cards */}
			{summary && (
				<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid grid-cols-2">
					<Card>
						<CardContent className="gap-2 pt-6 flex flex-col items-center text-center">
							<CheckCircle2Icon className="size-8 text-success" />
							<span className="text-2xl font-bold tabular-nums">{summary.healthy}</span>
							<span className="text-sm text-muted-foreground">{t("indexHealth.healthy")}</span>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="gap-2 pt-6 flex flex-col items-center text-center">
							<AlertTriangleIcon className="size-8 text-warning" />
							<span className="text-2xl font-bold tabular-nums">{summary.warning}</span>
							<span className="text-sm text-muted-foreground">{t("indexHealth.warning")}</span>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="gap-2 pt-6 flex flex-col items-center text-center">
							<AlertCircleIcon className="size-8 text-destructive" />
							<span className="text-2xl font-bold tabular-nums">{summary.critical}</span>
							<span className="text-sm text-muted-foreground">{t("indexHealth.critical")}</span>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="gap-2 pt-6 flex flex-col items-center text-center">
							<DatabaseIcon className="size-8 text-muted-foreground" />
							<span className="text-2xl font-bold tabular-nums">{summary.totalIndexes}</span>
							<span className="text-sm text-muted-foreground">{t("indexHealth.total")}</span>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Index health grid */}
			{indexes.length === 0 ? (
				<EmptyState
					title={t("indexHealth.noIndexes")}
					description={t("indexHealth.noIndexesDesc")}
					icon={SearchIcon}
					action={{ label: t("indexHealth.createIndex"), href: `/${orgSlug}/search` }}
				/>
			) : (
				<div className="gap-4 lg:grid-cols-2 xl:grid-cols-3 grid">
					{indexes.map((idx) => (
						<Card
							key={idx.id}
							className={`shadow-sm border-l-4 ${
								idx.status === "healthy"
									? "border-l-success"
									: idx.status === "warning"
										? "border-l-warning"
										: "border-l-destructive"
							}`}
						>
							<CardHeader className="gap-3 pb-3 flex-row items-start justify-between">
								<div className="min-w-0 gap-2 flex items-center">
									<div className="size-10 flex shrink-0 items-center justify-center rounded-lg border border-foreground/10">
										{statusIcon(idx.status, "size-5")}
									</div>
									<div className="min-w-0">
										<CardTitle className="text-base truncate">{idx.displayName}</CardTitle>
										<p className="text-xs font-mono truncate text-muted-foreground">{idx.slug}</p>
									</div>
								</div>
								<Badge
									status={
										idx.status === "healthy"
											? "success"
											: idx.status === "warning"
												? "warning"
												: "error"
									}
									className="shrink-0 capitalize"
								>
									{idx.status}
								</Badge>
							</CardHeader>

							<CardContent className="space-y-3">
								{/* Metrics grid */}
								<div className="gap-2 text-sm grid grid-cols-2">
									<div className="space-y-1">
										<span className="text-xs text-muted-foreground">
											{t("indexHealth.ingestQueue")}
										</span>
										<p className="font-medium tabular-nums">
											{idx.ingestBufferDepth.toLocaleString()}
										</p>
									</div>
									<div className="space-y-1">
										<span className="text-xs text-muted-foreground">
											{t("indexHealth.failedItems")}
										</span>
										<p className="font-medium tabular-nums">
											{idx.failedIngestItems}
											{idx.failedIngestItems > 0 && (
												<Badge status="error" className="ml-2 text-[10px]">
													{idx.failedIngestItems}
												</Badge>
											)}
										</p>
									</div>
									<div className="space-y-1">
										<span className="text-xs text-muted-foreground">
											{t("indexHealth.lastActivity")}
										</span>
										<p className="font-medium text-xs">{timeAgo(idx.lastActivityAt)}</p>
									</div>
									<div className="space-y-1">
										<span className="text-xs text-muted-foreground">
											{t("indexHealth.connector")}
										</span>
										<p className="gap-1 text-xs flex items-center">
											{idx.connectorStatus ? (
												<>
													<WifiIcon className="size-3 text-success" />
													{timeAgo(idx.connectorStatus)}
												</>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</p>
									</div>
								</div>

								{/* Reindex indicator */}
								{idx.activeReindex && (
									<div className="gap-2 text-sm flex items-center">
										<RefreshCwIcon className="size-3.5 animate-spin text-primary" />
										<span className="text-xs text-primary">{t("indexHealth.reindexing")}</span>
									</div>
								)}

								{/* Ingest buffer progress bar */}
								{idx.ingestBufferDepth > 0 && (
									<div className="space-y-1">
										<div className="text-xs flex items-center justify-between text-muted-foreground">
											<span>{t("indexHealth.buffer")}</span>
											<span>{idx.ingestBufferDepth.toLocaleString()}</span>
										</div>
										<Progress
											value={Math.min((idx.ingestBufferDepth / 10000) * 100, 100)}
											className="h-1.5"
										/>
									</div>
								)}

								{/* Actions */}
								<div className="gap-2 pt-1 flex flex-wrap">
									<Button variant="outline" size="sm" asChild>
										<Link href={`/${orgSlug}/search/${idx.slug}`}>
											{t("indexHealth.viewDetails")}
										</Link>
									</Button>
									<Button variant="ghost" size="sm" asChild>
										<Link href={`/${orgSlug}/search/${idx.slug}/indexing`}>
											{t("indexHealth.reindex")}
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Cluster metrics card */}
			{!clusterLoading && clusterData && (
				<Card className="shadow-sm">
					<CardHeader>
						<div className="gap-2 flex items-center">
							<CpuIcon className="size-5 text-muted-foreground" />
							<CardTitle className="text-base">{t("indexHealth.clusterMetrics")}</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<div className="gap-6 md:grid-cols-2 lg:grid-cols-4 grid grid-cols-2">
							{/* CPU */}
							<div className="space-y-2">
								<div className="gap-2 text-sm flex items-center text-muted-foreground">
									<CpuIcon className="size-4" />
									<span>{t("indexHealth.cpu")}</span>
								</div>
								<p className="text-2xl font-bold tabular-nums">
									{clusterData.system.cpuPercentage.toFixed(1)}%
								</p>
							</div>

							{/* Memory */}
							<div className="space-y-2">
								<div className="gap-2 text-sm flex items-center text-muted-foreground">
									<HardDriveIcon className="size-4" />
									<span>{t("indexHealth.memory")}</span>
								</div>
								<p className="text-2xl font-bold tabular-nums">
									{formatBytes(clusterData.typesense.memoryActiveBytes)}
									<span className="text-sm font-normal text-muted-foreground">
										{" / "}
										{formatBytes(clusterData.system.memoryTotalBytes)}
									</span>
								</p>
							</div>

							{/* Requests */}
							<div className="space-y-2">
								<div className="gap-2 text-sm flex items-center text-muted-foreground">
									<ActivityIcon className="size-4" />
									<span>{t("indexHealth.requests")}</span>
								</div>
								<p className="text-2xl font-bold tabular-nums">
									{clusterData.typesense.processedRequests.toLocaleString()}
								</p>
							</div>

							{/* Pending writes */}
							<div className="space-y-2">
								<div className="gap-2 text-sm flex items-center text-muted-foreground">
									<DatabaseIcon className="size-4" />
									<span>{t("indexHealth.pendingWrites")}</span>
								</div>
								<p className="text-2xl font-bold tabular-nums">
									{clusterData.typesense.pendingWriteBatches.toLocaleString()}
								</p>
							</div>
						</div>

						{/* API stats */}
						{apiStats?.success && apiStats.stats && Object.keys(apiStats.stats).length > 0 && (
							<div className="mt-6 pt-4 border-t border-border">
								<p className="mb-3 text-sm font-medium text-muted-foreground">
									{t("indexHealth.apiStats")}
								</p>
								<div className="gap-2 sm:grid-cols-3 lg:grid-cols-4 text-sm grid grid-cols-2">
									{Object.entries(apiStats.stats).map(([key, value]) => (
										<div key={key} className="space-y-0.5">
											<p className="text-xs font-mono truncate text-muted-foreground">{key}</p>
											<p className="font-medium tabular-nums">{String(value)}</p>
										</div>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
