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
import { ShoppingCartIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ShopifyStoreSettings } from "../panels/ShopifyStoreSettings";
import { ShopifySyncHistory } from "../panels/ShopifySyncHistory";
import type { ConnectorStatus } from "./ConnectorCard";

interface ShopifyConnectorCardProps {
	organizationId: string;
	status: ConnectorStatus;
}

export function ShopifyConnectorCard({ organizationId, status }: ShopifyConnectorCardProps) {
	const t = useTranslations();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);

	const statusBadge = status.isConnected ? "success" : status.lastError ? "error" : "warning";
	const statusLabel = status.isConnected
		? t("search.connector.statusOnline")
		: status.lastError
			? t("search.connector.statusOffline")
			: t("search.connector.statusUnknown");

	const handleConnect = () => {
		window.location.href = `/api/connectors/shopify/oauth/start?orgId=${organizationId}`;
	};

	return (
		<>
			<Card>
				<CardHeader className="gap-3 space-y-0 flex-row items-center">
					<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
						<ShoppingCartIcon className="size-5 text-muted-foreground" />
					</div>
					<div className="flex-1">
						<CardTitle className="text-base">{t("search.connectors.shopify.title")}</CardTitle>
						<CardDescription className="text-xs">
							{t("search.connectors.shopify.description")}
						</CardDescription>
					</div>
					<Badge status={statusBadge}>{statusLabel}</Badge>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 text-sm text-muted-foreground">
						{status.lastSync ? (
							<p>
								{t("search.connector.lastSync")}: {new Date(status.lastSync).toLocaleString()}
							</p>
						) : (
							<p>{t("search.connectors.shopify.notConnected")}</p>
						)}
						{status.lastError && (
							<p className="text-xs truncate text-destructive" title={status.lastError}>
								{t("search.connector.lastError")}: {status.lastError}
							</p>
						)}
					</div>
					<div className="mt-4 gap-2 flex flex-wrap">
						{status.isConnected ? (
							<>
								<Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
									{t("search.connector.manage")}
								</Button>
								<Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
									{t("search.connector.syncJobs")}
								</Button>
							</>
						) : (
							<Button variant="primary" size="sm" onClick={handleConnect}>
								{t("search.connectors.shopify.connectStore")}
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			<ShopifyStoreSettings
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				organizationId={organizationId}
			/>

			<ShopifySyncHistory
				open={historyOpen}
				onOpenChange={setHistoryOpen}
				organizationId={organizationId}
			/>
		</>
	);
}
