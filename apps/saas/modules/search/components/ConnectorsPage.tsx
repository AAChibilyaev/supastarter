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
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConnectorCard, type ConnectorStatus, type SourceType } from "./ConnectorCard";
import { ConnectorWizard } from "./ConnectorWizard";
import { SyncJobsTable } from "./SyncJobsTable";

interface ConnectorsPageProps {
	organizationId: string;
}

const CONNECTOR_SOURCES: SourceType[] = ["prestashop", "bitrix", "directApi"];

const EMPTY_CONNECTOR_STATUS: ConnectorStatus = {
	isConnected: false,
	lastSync: null,
	lastError: null,
};

export function ConnectorsPage({ organizationId }: ConnectorsPageProps) {
	const t = useTranslations();
	const [wizardOpen, setWizardOpen] = useState(false);
	const [wizardSource, setWizardSource] = useState<SourceType>("prestashop");

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

	const isNewOrg = !indexes || indexes.length === 0;

	const activeTokens = (tokens ?? []).filter((t) => !t.revokedAt);
	const hasAnyConnector = activeTokens.length > 0;

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

		const sourceKey = tokenName.toLowerCase().includes("prestashop")
			? "prestashop"
			: tokenName.toLowerCase().includes("bitrix")
				? "bitrix"
				: "directApi";

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

	const isLoading = indexesLoading || tokensLoading || syncJobsLoading;

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

			{/* Row 2: Active connectors table (hidden for new orgs) */}
			{!isNewOrg && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("search.connector.activeConnectors")}
						</CardTitle>
						<CardDescription>{t("search.connector.subtitle")}</CardDescription>
					</CardHeader>
					<CardContent>
						{activeTokens.length === 0 ? (
							<p className="py-4 text-sm text-center text-muted-foreground">
								{t("search.connector.noConnectors")}
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("search.connector.jobType")}</TableHead>
										<TableHead>{t("search.apiKeys.tableName")}</TableHead>
										<TableHead>{t("search.connector.jobStatus")}</TableHead>
										<TableHead>Last sync</TableHead>
										<TableHead>Last error</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{activeTokens.map(
										(token: {
											id: string;
											scopes: string[];
											name: string;
											index?: { slug: string } | null;
											revokedAt: Date | null;
										}) => {
											const lastJob = syncJobs?.find(
												(j) => j.indexId === token.index?.slug,
											);
											return (
												<TableRow key={token.id}>
													<TableCell className="font-medium">
														{token.scopes.join(", ")}
													</TableCell>
													<TableCell className="text-sm">
														{token.name}
													</TableCell>
													<TableCell>
														<Badge
															status={
																lastJob?.status === "completed"
																	? "success"
																	: lastJob?.status === "failed"
																		? "error"
																		: lastJob?.status ===
																			  "running"
																			? "warning"
																			: "info"
															}
														>
															{lastJob?.status === "completed"
																? t("search.connector.statusOnline")
																: lastJob?.status === "failed"
																	? t(
																			"search.connector.statusOffline",
																		)
																	: lastJob?.status === "running"
																		? t(
																				"search.connector.statusUnknown",
																			)
																		: t(
																				"search.connector.statusUnknown",
																			)}
														</Badge>
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														{lastJob?.finishedAt
															? new Date(
																	lastJob.finishedAt,
																).toLocaleString()
															: lastJob?.startedAt
																? new Date(
																		lastJob.startedAt,
																	).toLocaleString()
																: "—"}
													</TableCell>
													<TableCell className="text-sm text-rose-500 max-w-[200px] truncate">
														{lastJob?.status === "failed"
															? (lastJob.events
																	?.find(
																		(e) => e.level === "error",
																	)
																	?.message?.slice(0, 60) ?? "—")
															: "—"}
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
			<SyncJobsTable jobs={syncJobs ?? []} isLoading={syncJobsLoading} />

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
