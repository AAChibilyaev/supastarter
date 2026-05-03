"use client";

import { cn } from "@repo/ui";
import { DatabaseIcon } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(mb: number): string {
	if (mb < 1) return `${Math.round(mb * 1000)} KB`;
	if (mb > 1000) return `${(mb / 1000).toFixed(1)} GB`;
	return `${Math.round(mb)} MB`;
}

function formatRelativeTime(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60_000);
	if (diffMin < 1) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h ago`;
	const diffDay = Math.floor(diffHr / 24);
	return `${diffDay}d ago`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CollectionStatsProps {
	numDocuments: number;
	sizeMb?: number;
	lastActivityAt?: string;
	usagePercent: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CollectionStats({
	numDocuments,
	sizeMb,
	lastActivityAt,
	usagePercent,
}: CollectionStatsProps) {
	return (
		<>
			{/* Stats */}
			<div className="gap-1.5 text-sm flex flex-wrap">
				<div className="gap-1 inline-flex items-center text-muted-foreground">
					<DatabaseIcon className="size-3.5" />
					<span>{numDocuments.toLocaleString()} docs</span>
				</div>
				{sizeMb != null && (
					<span className="text-muted-foreground">
						{"\u00B7"} {formatBytes(sizeMb)}
					</span>
				)}
				{lastActivityAt && (
					<span className="text-muted-foreground">
						{"\u00B7"} {formatRelativeTime(lastActivityAt)}
					</span>
				)}
			</div>

			{/* Usage bar */}
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div
					className={cn(
						"h-full rounded-full transition-all",
						usagePercent > 90
							? "bg-destructive"
							: usagePercent > 70
								? "bg-warning"
								: "bg-primary",
					)}
					style={{ width: `${Math.max(usagePercent, 4)}%` }}
				/>
			</div>
			<span className="text-xs text-muted-foreground">{usagePercent}% of quota used</span>
		</>
	);
}
