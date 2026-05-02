"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Clock, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

// ── Types ───────────────────────────────────────────────────────

interface LastSyncInfoProps {
	lastFullSyncAt: string | null;
	lastDeltaSyncAt: string | null;
	nextScheduledAt: string | null;
	isLoading?: boolean;
}

// ── Sync row helper ─────────────────────────────────────────────

function SyncRow({
	icon,
	label,
	timestamp,
}: {
	icon: React.ReactNode;
	label: string;
	timestamp: string | null;
}) {
	const formatted = timestamp
		? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
		: "\u2014";

	const isRecent = timestamp && Date.now() - new Date(timestamp).getTime() < 5 * 60 * 1000;

	return (
		<div className="gap-3 py-2 flex items-center justify-between">
			<div className="gap-2 flex items-center">
				<span className="text-muted-foreground">{icon}</span>
				<span className="text-sm">{label}</span>
			</div>
			<div className="gap-2 flex items-center">
				<span className="text-sm text-muted-foreground">{formatted}</span>
				{isRecent && <Badge status="success">OK</Badge>}
			</div>
		</div>
	);
}

// ── Main component ───────────────────────────────────────────────

export function LastSyncInfo({
	lastFullSyncAt,
	lastDeltaSyncAt,
	nextScheduledAt,
	isLoading,
}: LastSyncInfoProps) {
	const t = useTranslations("indexing.dashboard");

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("indexingProgress")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-5 w-full" />
					<Skeleton className="h-5 w-full" />
					<Skeleton className="h-5 w-3/4" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="gap-2 text-base flex items-center">
					<RefreshCw className="size-4" />
					{t("indexingProgress")}
				</CardTitle>
			</CardHeader>
			<CardContent className="divide-y">
				<SyncRow
					icon={<RefreshCw className="size-4" />}
					label={t("lastFullSync")}
					timestamp={lastFullSyncAt}
				/>
				<SyncRow
					icon={<Clock className="size-4" />}
					label={t("lastDeltaSync")}
					timestamp={lastDeltaSyncAt}
				/>
				<SyncRow
					icon={<Calendar className="size-4" />}
					label={t("nextScheduled")}
					timestamp={nextScheduledAt}
				/>
			</CardContent>
		</Card>
	);
}
