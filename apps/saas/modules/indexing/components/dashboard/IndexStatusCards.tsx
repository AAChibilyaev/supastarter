"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Database, ActivityIcon, HardDrive, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

// ── Types ───────────────────────────────────────────────────────

interface IndexStatusCardsProps {
	numDocuments: number;
	todaySearches: number;
	sizeBytes: number | null;
	avgLatencyMs: number | null;
	version: number;
	isLive: boolean;
	isLoading?: boolean;
}

// ── Stat card component ──────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
	return (
		<Card>
			<CardContent className="gap-2 py-4 flex flex-col">
				<div className="gap-2 text-sm flex items-center text-muted-foreground">
					{icon}
					<span>{label}</span>
				</div>
				<span className="font-bold text-2xl tracking-tight">{value}</span>
			</CardContent>
		</Card>
	);
}

// ── Main component ───────────────────────────────────────────────

export function IndexStatusCards({
	numDocuments,
	todaySearches,
	sizeBytes,
	avgLatencyMs,
	version,
	isLive,
	isLoading,
}: IndexStatusCardsProps) {
	const t = useTranslations("indexing.dashboard");

	if (isLoading) {
		return (
			<div className="gap-4 md:grid-cols-5 grid grid-cols-2">
				{[...Array(4)].map((_, i) => (
					<Card key={i}>
						<CardContent className="gap-2 py-4 flex flex-col">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-8 w-28" />
						</CardContent>
					</Card>
				))}
				<Card>
					<CardContent className="gap-2 py-4 flex flex-col">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-6 w-16" />
					</CardContent>
				</Card>
			</div>
		);
	}

	const sizeDisplay =
		sizeBytes != null
			? sizeBytes > 1_073_741_824
				? `${(sizeBytes / 1_073_741_824).toFixed(1)} GB`
				: `${(sizeBytes / 1_048_576).toFixed(1)} MB`
			: "\u2014";

	const latencyDisplay = avgLatencyMs != null ? `${avgLatencyMs} ms` : "\u2014";

	return (
		<div className="gap-4 md:grid-cols-5 grid grid-cols-2">
			<StatCard
				icon={<Database className="size-4" />}
				label={t("documents")}
				value={numDocuments.toLocaleString()}
			/>
			<StatCard
				icon={<ActivityIcon className="size-4" />}
				label={t("todaySearches")}
				value={todaySearches.toLocaleString()}
			/>
			<StatCard icon={<HardDrive className="size-4" />} label={t("size")} value={sizeDisplay} />
			<StatCard
				icon={<Clock className="size-4" />}
				label={t("avgLatency")}
				value={latencyDisplay}
			/>
			<Card>
				<CardContent className="gap-2 py-4 flex flex-col">
					<div className="gap-2 text-sm flex items-center text-muted-foreground">
						<Badge status={isLive ? "success" : "warning"}>{t("liveVersion")}</Badge>
						<span className="text-xs text-muted-foreground">v{version}</span>
					</div>
					<span className="font-bold text-2xl tracking-tight">
						{isLive ? t("liveVersion") : `v${version}`}
					</span>
				</CardContent>
			</Card>
		</div>
	);
}
