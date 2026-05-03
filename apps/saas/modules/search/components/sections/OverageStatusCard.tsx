"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { formatKopecks } from "@payments/lib/format-kopecks";
import { Badge } from "@repo/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

interface OverageStatus {
	percentUsed: number;
	searchesUsed: number;
	searchLimit: number;
	isUnlimited: boolean;
	isSoftCap: boolean;
	isHardCap: boolean;
	overageEnabled: boolean;
	overageLimitKopecks: string | null;
	overageUsedKopecks: string | null;
	overageRemainingKopecks: string | null;
	overageRateUsdMicrosPerSearch: number;
}

export function OverageStatusCard() {
	const t = useTranslations("settings.billing");
	const { activeOrganization } = useActiveOrganization();
	const orgId = activeOrganization?.id;

	const { data, isLoading } = useQuery({
		...orpc.search.getOverageStatus.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
		enabled: Boolean(orgId),
	});
	const status = data as OverageStatus | undefined;

	if (!orgId) return null;

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("overageStatus.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-5 w-48" />
					<Skeleton className="h-2 w-full" />
					<Skeleton className="h-4 w-64" />
				</CardContent>
			</Card>
		);
	}

	if (!status) return null;

	// Determine badge color by usage level
	const getBadgeStatus = (): "success" | "warning" | "error" | "info" => {
		if (status.isHardCap) return "error";
		if (status.isSoftCap) return "warning";
		if (status.overageEnabled) return "info";
		return "success";
	};

	const getBadgeLabel = (): string => {
		if (status.isHardCap && status.overageEnabled) return t("overageStatus.overageActive");
		if (status.isHardCap) return t("overageStatus.hardCap");
		if (status.isSoftCap) return t("overageStatus.softCap");
		return t("overageStatus.normal");
	};

	const progressColor = (() => {
		if (status.percentUsed >= 100) return "bg-destructive";
		if (status.percentUsed >= 80) return "bg-warning";
		return "";
	})();

	return (
		<Card>
			<CardHeader>
				<div className="gap-2 flex items-center justify-between">
					<CardTitle>{t("overageStatus.title")}</CardTitle>
					{status.isUnlimited ? (
						<Badge status="info" className="text-xs">
							{t("overageStatus.unlimited")}
						</Badge>
					) : (
						<Badge status={getBadgeStatus()} className="text-xs">
							{getBadgeLabel()}
						</Badge>
					)}
				</div>
				<CardDescription>{t("overageStatus.description")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Searches usage */}
				{!status.isUnlimited && (
					<div>
						<div className="mb-1 text-sm flex items-center justify-between">
							<span>
								{t("overageStatus.searchesUsed", {
									used: status.searchesUsed.toLocaleString(),
									limit: status.searchLimit.toLocaleString(),
								})}
							</span>
							<span className="text-muted-foreground">
								{Math.round(status.percentUsed)}%
							</span>
						</div>
						<Progress
							value={Math.min(status.percentUsed, 100)}
							className={`h-2 ${progressColor}`}
						/>
					</div>
				)}

				{/* Overage wallet section */}
				{status.overageEnabled && status.overageRemainingKopecks !== null ? (
					<div className="space-y-2 p-3 rounded-lg border border-foreground/10 bg-foreground/3">
						<div className="text-sm flex items-center justify-between">
							<span className="font-medium">{t("overageStatus.walletBalance")}</span>
							<Badge status="info" className="text-xs">
								{t("overageStatus.overageActive")}
							</Badge>
						</div>
						<div className="text-sm text-muted-foreground">
							{formatKopecks(status.overageRemainingKopecks, {
								locale: "ru-RU",
								currency: "RUB",
							})}{" "}
							{t("overageStatus.remaining")}
						</div>
					</div>
				) : (
					!status.isUnlimited && (
						<p className="text-xs text-muted-foreground">
							{t("overageStatus.noOverage")}
						</p>
					)
				)}
			</CardContent>
		</Card>
	);
}
