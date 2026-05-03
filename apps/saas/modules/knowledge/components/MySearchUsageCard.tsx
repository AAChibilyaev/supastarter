"use client";

import { Button } from "@repo/ui/components/button";
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
import Link from "next/link";

type OwnerType = "USER" | "ORGANIZATION";

interface MySearchUsageCardProps {
	ownerType: OwnerType;
	ownerId: string;
	orgSlug?: string;
}

function formatBytes(bytes: number): string {
	if (bytes >= 1024 * 1024 * 1024) {
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	}
	if (bytes >= 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
	if (bytes >= 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${bytes} B`;
}

export function MySearchUsageCard({ ownerType, ownerId, orgSlug }: MySearchUsageCardProps) {
	const t = useTranslations("search.mySearch.usage");

	const { data, isLoading } = useQuery(
		orpc.knowledge.mySearchBilling.queryOptions({
			input: { ownerType, ownerId },
			enabled: Boolean(ownerId),
		}),
	);

	const billingHref = orgSlug ? `/${orgSlug}/settings/billing` : "/settings/billing";

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-4 w-24" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-2 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-2 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-2 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (!data) return null;

	const filePercent = Math.min(Math.round((data.fileCount / data.fileLimit) * 100), 100);
	const storagePercent = Math.min(
		Math.round((data.storageUsedBytes / data.storageLimitBytes) * 100),
		100,
	);
	const aiAsksPercent =
		data.aiAskLimit !== null
			? Math.min(Math.round((data.aiAsksThisMonth / data.aiAskLimit) * 100), 100)
			: 0;

	const isNearLimit =
		filePercent >= 80 ||
		storagePercent >= 80 ||
		(data.aiAskLimit !== null && aiAsksPercent >= 80);
	const showUpgradeCta = isNearLimit || data.plan === "free";

	return (
		<Card>
			<CardHeader>
				<div className="gap-2 flex items-center justify-between">
					<CardTitle className="text-base">{t("title")}</CardTitle>
					<span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
						{data.plan}
					</span>
				</div>
				<CardDescription className="sr-only">{t("title")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Files */}
				<div className="space-y-1">
					<div className="text-sm flex items-center justify-between">
						<span className="text-muted-foreground">{t("files")}</span>
						<span className="font-medium tabular-nums">
							{data.fileCount.toLocaleString()} / {data.fileLimit.toLocaleString()}
						</span>
					</div>
					<Progress value={filePercent} className="h-1.5" />
					<p className="text-xs text-muted-foreground">{filePercent}%</p>
				</div>

				{/* Storage */}
				<div className="space-y-1">
					<div className="text-sm flex items-center justify-between">
						<span className="text-muted-foreground">{t("storage")}</span>
						<span className="font-medium tabular-nums">
							{formatBytes(data.storageUsedBytes)} /{" "}
							{formatBytes(data.storageLimitBytes)}
						</span>
					</div>
					<Progress value={storagePercent} className="h-1.5" />
					<p className="text-xs text-muted-foreground">{storagePercent}%</p>
				</div>

				{/* AI Asks */}
				<div className="space-y-1">
					<div className="text-sm flex items-center justify-between">
						<span className="text-muted-foreground">{t("aiAsks")}</span>
						<span className="font-medium tabular-nums">
							{data.aiAsksThisMonth.toLocaleString()}
							{data.aiAskLimit !== null ? (
								<> / {data.aiAskLimit.toLocaleString()}</>
							) : (
								<span className="text-muted-foreground"> / {t("unlimited")}</span>
							)}
						</span>
					</div>
					{data.aiAskLimit !== null && (
						<>
							<Progress value={aiAsksPercent} className="h-1.5" />
							<p className="text-xs text-muted-foreground">{aiAsksPercent}%</p>
						</>
					)}
				</div>

				{/* Upgrade CTA */}
				{showUpgradeCta && data.plan !== "unlimited" && (
					<Button asChild variant="primary" size="sm" className="mt-2 w-full">
						<Link href={billingHref}>{t("upgradeCta")}</Link>
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
