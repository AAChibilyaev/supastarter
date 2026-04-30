"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { orpc } from "@shared/lib/orpc-query-utils";

import {
	ConnectorCard,
	type ConnectorStatus,
	type SourceType,
} from "./ConnectorCard";
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

	const { data: indexes, isLoading: indexesLoading } =
		orpc.search.listIndexes.useQuery({
			input: { organizationId },
		});

	const { data: tokens, isLoading: tokensLoading } =
		orpc.search.listConnectorTokens.useQuery({
			input: { organizationId },
		});

	const { data: syncJobs, isLoading: syncJobsLoading } =
		orpc.search.listConnectorSyncJobs.useQuery({
			input: { organizationId },
		});

	const isNewOrg = !indexes || indexes.length === 0;

	const activeTokens = tokens?.filter((t) => !t.revokedAt) ?? [];
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
			? activeTokens.find(
					(t) => t.index?.slug === lastJob.indexId || t.id === lastJob.indexId,
				)?.name ?? ""
				: "Direct API";

		// Find applicable source based on token name
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
					? lastJob.events.find((e) => e.level === "error")?.message ?? null
					: null,
		};
	}

	const handleSetup = (source: SourceType) => {
		setWizardSource(source);
		setWizardOpen(true);
	};

	return (
		<div className="space-y-6">
			{/* Page header */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight">
					{t("search.connector.title")}
				</h1>
				<p className="mt-1 text-muted-foreground">
					{t("search.connector.subtitle")}
				</p>
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
						<CardDescription>
							{t("search.connector.subtitle")}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{activeTokens.length === 0 ? (
							<p className="py-4 text-sm text-muted-foreground text-center">
								{t("search.connector.noConnectors")}
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("search.connector.jobType")}</TableHead>
										<TableHead>{t("search.apiKeys.tableName")}</TableHead>
										<TableHead>{t("search.connector.jobStatus")}</TableHead>
										<TableHead>
											{t("search.connector.lastSync", { time: "" })
												.replace(/: \{time\}$/, "")
												.replace(/:$/, "")}
										</TableHead>
										<TableHead>{t("search.connector.lastError", { error: "" }).replace(/: \{error\}$/, "").replace(/:$/, "")}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{activeTokens.map((token) => {
										const tokenSyncJobs = syncJobs?.filter(
											(j) => j.indexId === token.index?.slug,
										);
										const lastJob = tokenSyncJobs?.[0];
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
																	: lastJob?.status === "running"
																		? "warning"
																		: "info"
														}
													>
														{lastJob?.status === "completed"
															? t("search.connector.statusOnline")
															: lastJob?.status === "failed"
																? t("search.connector.statusOffline")
																: lastJob?.status === "running"
																	? t("search.connector.statusRunning")
																	: t("search.connector.statusUnknown")}
													</Badge>
												</TableCell>
												<TableCell className="text-sm text-muted-foreground">
													{lastJob?.finishedAt
														? new Date(lastJob.finishedAt).toLocaleString()
														: lastJob?.startedAt
															? new Date(lastJob.startedAt).toLocaleString()
															: "—"}
												</TableCell>
												<TableCell className="text-sm text-rose-500 max-w-[200px] truncate">
													{lastJob?.status === "failed"
														? lastJob.events
																.find((e) => e.level === "error")
																?.message?.slice(0, 60) ?? "—"
														: "—"}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			)}

			{/* Row 3: Sync Jobs */}
			<SyncJobsTable
				jobs={syncJobs ?? []}
				isLoading={syncJobsLoading}
			/>

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
