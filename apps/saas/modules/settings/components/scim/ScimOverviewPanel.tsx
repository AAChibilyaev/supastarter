"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { Loader2, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ScimEmptyState } from "./ScimEmptyState";
import { ScimEndpointCard } from "./ScimEndpointCard";
import { ScimStatusCard } from "./ScimStatusCard";

interface ScimConfig {
	id: string;
	organizationId: string;
	provider: string;
	bearerTokenPrefix: string;
	syncEnabled: boolean;
	lastSyncAt: string | null;
	lastSyncStatus: string | null;
	endpointUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

interface ScimOverviewPanelProps {
	organizationId: string;
}

export function ScimOverviewPanel({ organizationId }: ScimOverviewPanelProps) {
	const t = useTranslations();
	const { confirm } = useConfirmationAlert();

	const [config, setConfig] = useState<ScimConfig | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [tokenPrefix, setTokenPrefix] = useState<string>("");

	const fetchConfig = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/scim/config/${organizationId}`, {
				credentials: "include",
			});

			if (response.status === 404) {
				setConfig(null);
				return;
			}

			if (!response.ok) {
				throw new Error("Failed to load SCIM configuration");
			}

			const data = await response.json();
			setConfig(data);
			setTokenPrefix(data.bearerTokenPrefix);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load configuration");
		} finally {
			setIsLoading(false);
		}
	}, [organizationId]);

	useEffect(() => {
		void fetchConfig();
	}, [fetchConfig]);
	const handleRegenerate = async () => {
		try {
			const response = await fetch(`/api/scim/config/${organizationId}/regenerate-token`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Failed to regenerate token");
			}

			const data = await response.json();
			setTokenPrefix(data.bearerTokenPrefix);
			toastSuccess("Token regenerated successfully");
		} catch (err) {
			toastError(err instanceof Error ? err.message : "Failed to regenerate token");
		}
	};

	const handleRevoke = () => {
		confirm({
			title: t("settings.scim.disconnectDialog.title"),
			message: t("settings.scim.disconnectDialog.description"),
			destructive: true,
			confirmLabel: t("settings.scim.disconnectDialog.confirm"),
			cancelLabel: t("settings.scim.disconnectDialog.cancel"),
			onConfirm: async () => {
				try {
					const response = await fetch(`/api/scim/config/${organizationId}`, {
						method: "DELETE",
						credentials: "include",
					});

					if (!response.ok) {
						throw new Error("Failed to disconnect SCIM");
					}

					setConfig(null);
					toastSuccess("SCIM disconnected");
				} catch (err) {
					toastError(err instanceof Error ? err.message : "Failed to disconnect SCIM");
				}
			},
		});
	};

	if (isLoading) {
		return (
			<div className="py-16 flex items-center justify-center">
				<Loader2 className="size-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<Card className="p-8 text-center">
				<p className="text-sm mb-4 text-destructive">{error}</p>
				<Button variant="outline" onClick={fetchConfig}>
					Retry
				</Button>
			</Card>
		);
	}

	if (!config) {
		return <ScimEmptyState organizationId={organizationId} />;
	}

	return (
		<div className="space-y-6">
			{/* Status overview */}
			<ScimStatusCard
				provider={config.provider}
				isActive={config.syncEnabled}
				lastSyncAt={config.lastSyncAt}
				usersProvisioned={0}
				lastSyncStatus={config.lastSyncStatus}
			/>

			{/* Endpoint info */}
			<ScimEndpointCard
				organizationId={organizationId}
				bearerTokenPrefix={tokenPrefix || config.bearerTokenPrefix}
				endpointUrl={config.endpointUrl}
				onRegenerate={handleRegenerate}
				onRevoke={handleRevoke}
			/>

			{/* View logs link */}
			<div className="flex justify-end">
				<Button asChild variant="ghost" size="sm">
					<Link href="scim/logs">
						<ScrollText className="size-3.5 mr-1.5" />
						{t("settings.scim.endpoint.viewLogs")}
					</Link>
				</Button>
			</div>
		</div>
	);
}
