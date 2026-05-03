"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { toastError } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Cable, Clock, RefreshCw, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConnectorCard, type ConnectorStatus, type SourceType } from "../cards/ConnectorCard";
import { EmptyState } from "../cards/EmptyState";
import { ConnectorWizard } from "../dialogs/ConnectorWizard";
import { SyncJobsTable } from "../tables/SyncJobsTable";

interface ConnectorsPageProps {
	organizationId: string;
}

const CONNECTOR_SOURCES: SourceType[] = ["prestashop", "bitrix", "directApi"];

const EMPTY_CONNECTOR_STATUS: ConnectorStatus = {
	isConnected: false,
	lastSync: null,
	lastError: null,
};

function relativeTime(
	dateStr: string | Date | null | undefined,
	t: (key: string, values?: Record<string, string | number | Date>) => string,
): string {
	if (!dateStr) return "";
	const ms = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(ms / 60000);
	if (mins < 1) return t("search.connector.time.lessThanMinute");
	if (mins < 60) return t("search.connector.time.minutes", { count: mins });
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return t("search.connector.time.hoursMinutes", { h: hrs, m: mins % 60 });
	return t("search.connector.time.days", { count: Math.floor(hrs / 24) });
}

function deriveSourceType(name: string): SourceType {
	const lower = name.toLowerCase();
	if (lower.includes("prestashop")) return "prestashop";
	if (lower.includes("bitrix")) return "bitrix";
	return "directApi";
}

function connectorStatusFromToken(token: {
	id: string;
	name: string;
	lastUsedAt: Date | null;
	revokedAt: Date | null;
	index?: { slug: string } | null;
}): "online" | "unknown" | "offline" {
	if (token.revokedAt) return "offline";
	if (!token.lastUsedAt) return "unknown";
	const ms = Date.now() - new Date(token.lastUsedAt).getTime();
	if (ms < 5 * 60 * 1000) return "online";
	if (ms < 30 * 60 * 1000) return "unknown";
	return "offline";
}

export function ConnectorsPage({ organizationId }: ConnectorsPageProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [wizardOpen, setWizardOpen] = useState(false);
	const [wizardSource, setWizardSource] = useState<SourceType>("prestashop");
	const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
	const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null);

	const { data: indexes, isLoading: indexesLoading } = useQuery(
		orpc.search.listIndexes.queryOptions({
			input: { organizationId },
		}),
	);

	const { data: tokens, isLoading: tokensLoading } = useQuery(
		orpc.search.listConnectorTokens.queryOptions({
			input: { organizationId },
		}),
	);

	const { data: syncJobs, isLoading: syncJobsLoading } = useQuery(
		orpc.search.listConnectorSyncJobs.queryOptions({
			input: { organizationId },
		}),
	);

	const { data: pipelineStatus, isLoading: pipelineLoading } = useQuery(
		orpc.search.pipelineStatus.queryOptions({
			input: { organizationId },
		}),
	);

	const revokeMutation = useMutation({
		...orpc.search.revokeConnectorToken.mutationOptions(),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: orpc.search.listConnectorTokens.key(),
			});
		},
		onError: () => {
			toastError(t("search.connector.revokeError"));
		},
	});

	const retryMutation = useMutation({
		...orpc.search.retryFailedBatches.mutationOptions(),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: orpc.search.pipelineStatus.key(),
			});
		},
		onError: () => {
			toastError(t("search.connector.retryError"));
		},
	});

	const isNewOrg = !indexes || indexes.length === 0;

	const activeTokens = (tokens ?? []).filter((t) => !t.revokedAt);

	const sourceStatusMap: Record<SourceType, ConnectorStatus> = {
		prestashop: EMPTY_CONNECTOR_STATUS,
		bitrix: EMPTY_CONNECTOR_STATUS,
		directApi: EMPTY_CONNECTOR_STATUS,
	};

	// Derive status from sync job data if available
	if (syncJobs && syncJobs.length > 0) {
		const lastJob = syncJobs[0];
		const tokenName = lastJob.indexId
			? (activeTokens.find(
					(token) =>
						token.index?.slug === lastJob.indexId || token.id === lastJob.indexId,
				)?.name ?? "")
			: "Direct API";

		const sourceKey = deriveSourceType(tokenName);

		sourceStatusMap[sourceKey] = {
			isConnected: lastJob.status === "completed" || lastJob.status === "running",
			lastSync: lastJob.finishedAt ?? lastJob.startedAt,
			lastError:
				lastJob.status === "failed"
					? (lastJob.events?.find((e) => e.level === "error")?.message ?? null)
					: null,
		};
	}

	const handleSetup = (source: SourceType) => {
		setWizardSource(source);
		setWizardOpen(true);
	};

	const handleRevoke = async (keyId: string) => {
		setRevokingTokenId(keyId);
		try {
			await revokeMutation.mutateAsync({
				organizationId,
				keyId,
			});
		} finally {
			setRevokingTokenId(null);
		}
	};

	const handleSyncNow = () => {
		void queryClient.invalidateQueries({
			queryKey: orpc.search.listConnectorSyncJobs.key(),
		});
		void queryClient.invalidateQueries({
			queryKey: orpc.search.pipelineStatus.key(),
		});
	};

	const handleRetryJob = async (jobId: string) => {
		setRetryingJobId(jobId);
		const job = syncJobs?.find((j) => j.id === jobId);
		const slug = job?.indexId ?? indexes?.[0]?.slug;
		if (!slug) {
			setRetryingJobId(null);
			return;
		}
		try {
			await retryMutation.mutateAsync({
				organizationId,
				slug,
			});
			void queryClient.invalidateQueries({
				queryKey: orpc.search.listConnectorSyncJobs.key(),
			});
		} finally {
			setRetryingJobId(null);
		}
	};

	const isLoading = indexesLoading || tokensLoading || syncJobsLoading || pipelineLoading;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-96" />
				</div>
				<div className="gap-6 md:grid-cols-3 grid">
					{CONNECTOR_SOURCES.map((_, i) => (
						<Skeleton key={i} className="h-40 rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Page header */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{t("search.connector.title")}</h1>
				<p className="mt-1 text-muted-foreground">{t("search.connector.subtitle")}</p>
			</div>

			{/* Pipeline stats row */}
			{pipelineStatus && (
				<div className="gap-4 sm:grid-cols-4 grid grid-cols-2">
					<Card>
						<CardHeader className="gap-1 p-3 space-y-0 flex-row items-center">
							<Cable className="mr-2 size-4 text-muted-foreground" />
							<CardTitle className="text-xs font-medium text-muted-foreground">
								{t("search.connector.pipeline.buffer")}
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-3 pt-0 px-3">
							<p className="text-2xl font-bold">{pipelineStatus.bufferDepth}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="gap-1 p-3 space-y-0 flex-row items-center">
							<RefreshCw className="mr-2 size-4 text-muted-foreground" />
							<CardTitle className="text-xs font-medium text-muted-foreground">
								{t("search.connector.pipeline.throughput")}
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-3 pt-0 px-3">
							<p className="text-2xl font-bold">
								{pipelineStatus.workerThroughput}/5m
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="gap-1 p-3 space-y-0 flex-row items-center">
							<AlertTriangle className="mr-2 size-4 text-muted-foreground" />
							<CardTitle className="text-xs font-medium text-muted-foreground">
								{t("search.connector.pipeline.retryQueue")}
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-3 pt-0 px-3">
							<p className="text-2xl font-bold">{pipelineStatus.retryQueueSize}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="gap-1 p-3 space-y-0 flex-row items-center">
							<XCircle className="mr-2 size-4 text-destructive" />
							<CardTitle className="text-xs font-medium text-muted-foreground">
								{t("search.connector.pipeline.failed")}
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-3 pt-0 px-3">
							<p className="text-2xl font-bold text-destructive">
								{pipelineStatus.failedCount}
							</p>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Row 1: Connector Cards */}
			<div className="gap-6 md:grid-cols-3 grid">
				{CONNECTOR_SOURCES.map((source) => (
					<ConnectorCard
						key={source}
						type={source}
						status={sourceStatusMap[source]}
						onSetup={() => handleSetup(source)}
					/>
				))}
			</div>

			{/* Row 2: Active connectors table */}
			{!isNewOrg && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("search.connector.activeConnectors")}
						</CardTitle>
						<CardDescription>
							{t("search.connector.activeConnectorsDesc")}
						</CardDescription>
					</CardHeader>
					<CardContent className="overflow-x-auto">
						{activeTokens.length === 0 ? (
							<EmptyState
								variant="inline"
								description={t("search.connector.noConnectors")}
							/>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("search.connector.jobType")}</TableHead>
										<TableHead>{t("search.apiKeys.tableName")}</TableHead>
										<TableHead>{t("search.connector.jobStatus")}</TableHead>
										<TableHead>{t("search.connector.lastHeartbeat")}</TableHead>
										<TableHead className="text-right">
											{t("search.connector.jobActions")}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{activeTokens.map(
										(token: {
											id: string;
											prefix: string;
											scopes: string[];
											name: string;
											lastUsedAt: Date | null;
											expiresAt: Date | null;
											createdAt: Date;
											index?: {
												id: string;
												slug: string;
												displayName: string;
											} | null;
											revokedAt: Date | null;
										}) => {
											const status = connectorStatusFromToken(token);
											return (
												<TableRow key={token.id}>
													<TableCell className="font-medium">
														{t(
															`search.connector.${deriveSourceType(token.name)}`,
														)}
													</TableCell>
													<TableCell className="text-sm">
														{token.name}
													</TableCell>
													<TableCell>
														<Badge
															status={
																status === "online"
																	? "success"
																	: status === "unknown"
																		? "warning"
																		: "error"
															}
														>
															{status === "online"
																? t("search.connector.statusOnline")
																: status === "unknown"
																	? t(
																			"search.connector.statusUnknown",
																		)
																	: t(
																			"search.connector.statusOffline",
																		)}
														</Badge>
													</TableCell>
													<TableCell className="text-sm whitespace-nowrap text-muted-foreground">
														{token.lastUsedAt ? (
															<span className="gap-1 inline-flex items-center">
																<Clock className="size-3" />
																{t("search.connector.time.ago", {
																	time: relativeTime(
																		token.lastUsedAt,
																		t,
																	),
																})}
															</span>
														) : (
															"—"
														)}
													</TableCell>
													<TableCell className="text-right">
														<div className="gap-2 flex justify-end">
															<Button
																variant="outline"
																size="sm"
																onClick={handleSyncNow}
															>
																<RefreshCw className="mr-1 size-3" />
																{t("search.connector.syncNow")}
															</Button>
															<Button
																variant="destructive"
																size="sm"
																loading={
																	revokingTokenId === token.id
																}
																onClick={() =>
																	handleRevoke(token.id)
																}
															>
																{t("search.connector.revokeToken")}
															</Button>
														</div>
													</TableCell>
												</TableRow>
											);
										},
									)}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			)}

			{/* Row 3: Sync Jobs */}
			<Card>
				<div className="gap-2 px-6 py-4 flex items-center border-b">
					<span className="font-medium text-sm">
						{t("search.connector.syncJobs")} ({syncJobs?.length ?? 0})
					</span>
					<span className="text-xs text-muted-foreground">
						<Clock className="mr-1 size-3 inline" />
						{t("search.connector.syncJobsNote")}
					</span>
				</div>
				{syncJobs?.length === 0 && !syncJobsLoading ? (
					<div className="p-6 text-sm text-muted-foreground">
						{t("search.connector.noJobLogs")}
					</div>
				) : (
					<SyncJobsTable
						jobs={syncJobs ?? []}
						isLoading={syncJobsLoading}
						onRetry={handleRetryJob}
						retryingJobId={retryingJobId}
					/>
				)}
			</Card>

			{/* Connector Wizard */}
			<ConnectorWizard
				open={wizardOpen}
				onOpenChange={setWizardOpen}
				source={wizardSource}
				organizationId={organizationId}
			/>
		</div>
	);
}
