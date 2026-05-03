"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangleIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface ShopifyStoreSettingsProps {
	organizationId: string;
	store: {
		id: string;
		shop: string;
		name: string | null;
		domain: string | null;
		syncStatus: string;
		syncError: string | null;
		lastSyncAt: string | null;
		installedAt: string;
	};
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function getSyncStatusBadge(status: string): "success" | "warning" | "error" | "info" {
	switch (status) {
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

export function ShopifyStoreSettings({
	organizationId: _organizationId,
	store,
	open,
	onOpenChange,
}: ShopifyStoreSettingsProps) {
	const tShopify = useTranslations("search.connector.shopify");
	const queryClient = useQueryClient();

	const triggerSyncMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/shopify/${store.id}/sync`, {
				method: "POST",
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Failed to trigger sync");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success(tShopify("syncStarted"));
			void queryClient.invalidateQueries({
				queryKey: orpc.search.listShopifyStores.key(),
			});
		},
		onError: (err) => toast.error(err instanceof Error ? err.message : tShopify("syncError")),
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{store.name || store.shop}</DialogTitle>
					<DialogDescription>
						{store.domain || store.shop}
						{store.installedAt && (
							<>
								{" "}
								· {tShopify("installedOn")}: {new Date(store.installedAt).toLocaleDateString()}
							</>
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="gap-4 flex items-center justify-between">
						<span className="text-sm font-medium">{tShopify("syncStatus")}</span>
						<Badge status={getSyncStatusBadge(store.syncStatus)}>
							{store.syncStatus === "active"
								? tShopify("statusActive")
								: store.syncStatus === "syncing"
									? tShopify("statusSyncing")
									: store.syncStatus === "error"
										? tShopify("statusError")
										: tShopify("statusPending")}
						</Badge>
					</div>

					{store.syncError && (
						<div className="gap-2 p-3 text-sm flex items-start rounded-lg bg-destructive/10 text-destructive">
							<AlertTriangleIcon className="size-4 mt-0.5 shrink-0" />
							<span>{store.syncError}</span>
						</div>
					)}

					<Button
						variant="primary"
						size="sm"
						onClick={() => triggerSyncMutation.mutate()}
						loading={triggerSyncMutation.isPending}
						disabled={store.syncStatus === "syncing"}
						className="w-full"
					>
						<RefreshCwIcon className="mr-2 size-4" />
						{tShopify("triggerSync")}
					</Button>

					<Card>
						<CardHeader className="p-3">
							<CardTitle className="text-xs font-medium text-muted-foreground">
								{tShopify("connectionDetails")}
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-3 pt-0 px-3 space-y-1.5">
							<div className="gap-2 text-xs flex items-center justify-between">
								<span className="text-muted-foreground">{tShopify("storeDomain")}</span>
								<a
									href={`https://${store.domain || store.shop}`}
									target="_blank"
									rel="noopener noreferrer"
									className="gap-1 flex items-center text-primary hover:underline"
								>
									{store.domain || store.shop}
									<ExternalLinkIcon className="size-3" />
								</a>
							</div>
							{store.lastSyncAt && (
								<div className="gap-2 text-xs flex items-center justify-between">
									<span className="text-muted-foreground">{tShopify("lastSync")}</span>
									<span>{new Date(store.lastSyncAt).toLocaleString()}</span>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</DialogContent>
		</Dialog>
	);
}
