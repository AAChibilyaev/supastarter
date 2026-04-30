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
import { type LucideIcon, BlocksIcon, DatabaseIcon, GlobeIcon, ServerIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export type SourceType = "prestashop" | "bitrix" | "directApi";

export interface ConnectorStatus {
	isConnected: boolean;
	lastSync: string | null;
	lastError: string | null;
}

interface ConnectorCardProps {
	type: SourceType;
	status: ConnectorStatus;
	onSetup?: () => void;
	onManage?: () => void;
}

const sourceIcons: Record<SourceType, LucideIcon> = {
	prestashop: BlocksIcon,
	bitrix: GlobeIcon,
	directApi: ServerIcon,
};

export function ConnectorCard({ type, status, onSetup, onManage }: ConnectorCardProps) {
	const t = useTranslations();
	const Icon = sourceIcons[type];

	const statusBadge = status.isConnected ? "success" : status.lastError ? "error" : "warning";
	const statusLabel = status.isConnected
		? t("search.connector.statusOnline")
		: status.lastError
			? t("search.connector.statusOffline")
			: t("search.connector.statusUnknown");

	return (
		<Card>
			<CardHeader className="gap-3 space-y-0 flex-row items-center">
				<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
					<Icon className="size-5 text-muted-foreground" />
				</div>
				<div className="flex-1">
					<CardTitle className="text-base">{t(`search.connector.${type}`)}</CardTitle>
					<CardDescription className="text-xs">
						{t(`search.connector.${type}Desc`)}
					</CardDescription>
				</div>
				<Badge status={statusBadge}>{statusLabel}</Badge>
			</CardHeader>
			<CardContent>
				<div className="space-y-2 text-sm text-muted-foreground">
					{status.lastSync ? (
						<p>
							{t("search.connector.lastSync")}:{" "}
							{new Date(status.lastSync).toLocaleString()}
						</p>
					) : (
						<p>{t("search.connector.noHeartbeat")}</p>
					)}
					{status.lastError && (
						<p className="text-rose-500 text-xs truncate" title={status.lastError}>
							{t("search.connector.lastError")}: {status.lastError}
						</p>
					)}
				</div>
				<div className="mt-4">
					{type === "directApi" ? (
						<Button variant="outline" size="sm" asChild>
							<a
								href="https://docs.aacsearch.com/api"
								target="_blank"
								rel="noopener noreferrer"
							>
								{t("search.connector.viewDocs")}
							</a>
						</Button>
					) : status.isConnected && onManage ? (
						<Button variant="primary" size="sm" onClick={onManage}>
							{t("search.connector.manage")}
						</Button>
					) : (
						<Button variant="primary" size="sm" onClick={onSetup}>
							{t("search.connector.setup")}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
