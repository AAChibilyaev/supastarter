"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { Switch } from "@repo/ui/components/switch";
import { toastSuccess } from "@repo/ui/components/toast";
import { RefreshCw, ShoppingCartIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ShopifyStoreSettingsProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
}

const SHOPIFY_COLLECTIONS = [
	"products",
	"collections",
	"variants",
	"pages",
	"blogs",
] as const;

type ShopifyCollection = (typeof SHOPIFY_COLLECTIONS)[number];

export function ShopifyStoreSettings({
	open,
	onOpenChange,
	organizationId: _organizationId,
}: ShopifyStoreSettingsProps) {
	const t = useTranslations();
	const [autoSync, setAutoSync] = useState(true);
	const [syncing, setSyncing] = useState(false);
	const [selectedCollections, setSelectedCollections] = useState<Set<ShopifyCollection>>(
		new Set(["products"]),
	);

	const toggleCollection = (collection: ShopifyCollection) => {
		setSelectedCollections((prev) => {
			const next = new Set(prev);
			if (next.has(collection)) {
				next.delete(collection);
			} else {
				next.add(collection);
			}
			return next;
		});
	};

	const handleSyncNow = async () => {
		setSyncing(true);
		try {
			// Stub: real sync will be wired to POST /api/projects/:projectId/sync/full
			await new Promise<void>((resolve) => setTimeout(resolve, 800));
			toastSuccess(t("search.connector.syncSuccess"));
		} finally {
			setSyncing(false);
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-md overflow-y-auto">
				<SheetHeader>
					<div className="gap-3 flex items-center">
						<div className="size-9 flex shrink-0 items-center justify-center rounded-lg bg-muted">
							<ShoppingCartIcon className="size-4 text-muted-foreground" />
						</div>
						<div>
							<SheetTitle>{t("search.connectors.shopify.title")}</SheetTitle>
							<SheetDescription className="text-xs">
								{t("search.connectors.shopify.description")}
							</SheetDescription>
						</div>
					</div>
				</SheetHeader>

				<div className="mt-6 space-y-6">
					{/* Collections to index */}
					<div className="space-y-3">
						<p className="text-sm font-medium">
							{t("search.connectors.shopify.collectionsLabel")}
						</p>
						<div className="space-y-2">
							{SHOPIFY_COLLECTIONS.map((col) => (
								<div key={col} className="gap-2 flex items-center">
									<Checkbox
										id={`shopify-col-${col}`}
										checked={selectedCollections.has(col)}
										onCheckedChange={() => toggleCollection(col)}
									/>
									<Label htmlFor={`shopify-col-${col}`} className="capitalize text-sm">
										{col}
									</Label>
									{col === "products" && (
										<Badge status="info" className="text-xs">
											{t("search.connectors.shopify.recommended")}
										</Badge>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Auto-sync toggle */}
					<div className="gap-3 flex items-center justify-between">
						<div className="space-y-0.5">
							<p className="text-sm font-medium">
								{t("search.connectors.shopify.autoSync")}
							</p>
							<p className="text-xs text-muted-foreground">
								{t("search.connectors.shopify.autoSyncDesc")}
							</p>
						</div>
						<Switch checked={autoSync} onCheckedChange={setAutoSync} />
					</div>

					{/* Sync Now */}
					<div className="pt-2">
						<Button
							variant="outline"
							size="sm"
							loading={syncing}
							onClick={() => void handleSyncNow()}
						>
							<RefreshCw className="mr-2 size-3.5" />
							{t("search.connectors.shopify.syncNow")}
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
