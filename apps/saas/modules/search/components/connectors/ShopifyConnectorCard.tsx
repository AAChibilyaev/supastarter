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
import { StoreIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export type ShopifyStoreInfo = {
	id: string;
	shop: string;
	name: string | null;
	domain: string | null;
	syncStatus: string;
	syncError: string | null;
	lastSyncAt: string | null;
	installedAt: string;
};

interface ShopifyConnectorCardProps {
	stores: ShopifyStoreInfo[];
	storeCount: number;
	isConnected: boolean;
	isLoading: boolean;
	lastSyncAt: string | null;
	onConnect: () => void;
	onManage: (storeId: string) => void;
	onDisconnect: (storeId: string) => void;
	onSync: (storeId: string) => void;
}

function getStatusBadge(syncStatus: string): "success" | "warning" | "error" | "info" {
	switch (syncStatus) {
		case "active":
			return "success";
		case "syncing":
			return "info";
		case "error":
			return "error";
		default:
			return "warning";
	}
}

function getStatusLabel(syncStatus: string, t: (key: string) => string): string {
	switch (syncStatus) {
		case "active":
			return t("search.connector.shopify.statusActive");
		case "syncing":
			return t("search.connector.shopify.statusSyncing");
		case "error":
			return t("search.connector.shopify.statusError");
		case "pending":
			return t("search.connector.shopify.statusPending");
		default:
			return syncStatus;
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

export function ShopifyConnectorCard({
	stores,
	storeCount,
	isLoading,
	lastSyncAt,
	onConnect,
	onManage,
	onDisconnect,
	onSync,
}: ShopifyConnectorCardProps) {
	const t = useTranslations();

	if (isLoading) {
		return <Skeleton className="h-40 rounded-xl" />;
	}

	return (
		<Card>
			<CardHeader className="gap-3 space-y-0 flex-row items-center">
				<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
					<StoreIcon className="size-5 text-muted-foreground" />
				</div>
				<div className="flex-1">
					<CardTitle className="text-base">
						{t("search.connector.shopify.title")}
					</CardTitle>
					<CardDescription className="text-xs">
						{t("search.connector.shopify.desc")}
					</CardDescription>
				</div>
				<Badge
					status={
						storeCount > 0
							? stores.some((s) => s.syncStatus === "active")
								? "success"
								: "warning"
							: "warning"
					}
				>
					{storeCount > 0
						? t("search.connector.shopify.connected", { count: storeCount })
						: t("search.connector.shopify.notConnected")}
				</Badge>
			</CardHeader>
			<CardContent>
				{storeCount > 0 ? (
					<div className="space-y-3">
						{stores.slice(0, 3).map((store) => (
							<div
								key={store.id}
								className="gap-3 px-3 py-2 flex items-center justify-between rounded-lg border border-border"
							>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium truncate">
										{store.name || store.shop}
									</p>
									<p className="text-xs truncate text-muted-foreground">
										{store.domain || store.shop}
										{store.lastSyncAt && (
											<>
												{" "}
												· {t("search.connector.shopify.synced")}:{" "}
												{relativeTime(store.lastSyncAt, t)}
											</>
										)}
									</p>
								</div>
								<Badge status={getStatusBadge(store.syncStatus)}>
									{getStatusLabel(store.syncStatus, t)}
								</Badge>
							</div>
						))}
						{storeCount > 3 && (
							<p className="text-xs text-center text-muted-foreground">
								{t("search.connector.shopify.andMore", { count: storeCount - 3 })}
							</p>
						)}
					</div>
				) : (
					<p className="mb-3 text-sm text-muted-foreground">
						{t("search.connector.shopify.noStores")}
					</p>
				)}

				<div className="mt-3 gap-2 flex">
					<Button variant="primary" size="sm" onClick={onConnect}>
						{t("search.connector.shopify.connectStore")}
					</Button>
					{storeCount > 0 && (
						<Button variant="outline" size="sm" onClick={() => onManage(stores[0].id)}>
							{t("search.connector.shopify.manage")}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
