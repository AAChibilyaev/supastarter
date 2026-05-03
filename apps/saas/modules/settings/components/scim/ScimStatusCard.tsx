"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card } from "@repo/ui/components/card";
import { CheckCircle2, RefreshCw, Users, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface ScimStatusCardProps {
	provider: string;
	isActive: boolean;
	lastSyncAt: string | null;
	usersProvisioned: number;
	lastSyncStatus: string | null;
}

const PROVIDER_LABELS: Record<string, string> = {
	okta: "Okta",
	azure_ad: "Azure AD",
	google_workspace: "Google Workspace",
	keycloak: "Keycloak",
	other: "Other",
};

export function ScimStatusCard({
	provider,
	isActive,
	lastSyncAt,
	usersProvisioned,
	lastSyncStatus,
}: ScimStatusCardProps) {
	const t = useTranslations();

	const formatDate = (iso: string) => {
		try {
			return new Date(iso).toLocaleString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return iso;
		}
	};

	return (
		<Card className="p-6">
			<div className="gap-4 sm:grid-cols-2 lg:grid-cols-4 grid grid-cols-1">
				{/* Provider */}
				<div className="space-y-1">
					<p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
						Provider
					</p>
					<p className="text-sm font-medium">{PROVIDER_LABELS[provider] ?? provider}</p>
				</div>

				{/* Status */}
				<div className="space-y-1">
					<p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
						Status
					</p>
					<div className="gap-2 flex items-center">
						{isActive ? (
							<Badge
								status="success"
								className="gap-1 inline-flex items-center normal-case"
							>
								<CheckCircle2 className="size-3" />
								{t("settings.scim.status.active")}
							</Badge>
						) : (
							<Badge
								status="error"
								className="gap-1 inline-flex items-center normal-case"
							>
								<XCircle className="size-3" />
								{t("settings.scim.status.inactive")}
							</Badge>
						)}
					</div>
				</div>

				{/* Last sync */}
				<div className="space-y-1">
					<p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
						{t("settings.scim.status.lastSync")}
					</p>
					<div className="gap-1.5 flex items-center">
						<RefreshCw className="size-3.5 text-muted-foreground" />
						<p className="text-sm">{lastSyncAt ? formatDate(lastSyncAt) : "Never"}</p>
					</div>
					{lastSyncStatus && (
						<p className="text-xs text-muted-foreground/60">
							{lastSyncStatus === "success" ? "Sync succeeded" : "Sync failed"}
						</p>
					)}
				</div>

				{/* Users provisioned */}
				<div className="space-y-1">
					<p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
						{t("settings.scim.status.usersProvisioned")}
					</p>
					<div className="gap-1.5 flex items-center">
						<Users className="size-3.5 text-muted-foreground" />
						<p className="text-sm font-medium">{usersProvisioned.toLocaleString()}</p>
					</div>
				</div>
			</div>
		</Card>
	);
}
