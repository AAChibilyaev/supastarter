"use client";

import { cn } from "@repo/ui";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import {
	CopyIcon,
	DatabaseIcon,
	DownloadIcon,
	MoreHorizontalIcon,
	SettingsIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CollectionData {
	id: string;
	slug: string;
	displayName: string;
	enabled: boolean;
	numDocuments: number;
	sizeMb?: number;
	fieldsCount: number;
	lastActivityAt?: string;
	createdAt: string;
}

interface CollectionCardProps {
	collection: CollectionData;
	organizationSlug: string;
	onDelete?: (id: string) => void;
	onDuplicate?: (id: string) => void;
}

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

// ─── Component ───────────────────────────────────────────────────────────────

export function CollectionCard({
	collection,
	organizationSlug,
	onDelete,
	onDuplicate,
}: CollectionCardProps) {
	const t = useTranslations();

	const usagePercent =
		collection.numDocuments > 0
			? Math.min(100, Math.round((collection.numDocuments / 100_000) * 100))
			: 0;

	return (
		<Card className="group hover:shadow-md relative flex flex-col transition-shadow">
			<CardHeader className="pb-2">
				<div className="gap-2 flex items-start justify-between">
					<div className="min-w-0 flex-1">
						<CardTitle className="text-base truncate">
							<Link
								href={`/${organizationSlug}/collections/${collection.slug}`}
								className="transition-colors hover:text-primary"
							>
								{collection.displayName || collection.slug}
							</Link>
						</CardTitle>
						<CardDescription className="font-mono text-xs truncate">
							{collection.slug}
						</CardDescription>
					</div>
					<Badge status={collection.enabled ? "success" : "warning"}>
						{collection.enabled ? "active" : "disabled"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="gap-3 pb-3 flex flex-1 flex-col">
				{/* Stats */}
				<div className="gap-1.5 text-sm flex flex-wrap">
					<div className="gap-1 inline-flex items-center text-muted-foreground">
						<DatabaseIcon className="size-3.5" />
						<span>{collection.numDocuments.toLocaleString()} docs</span>
					</div>
					{collection.sizeMb != null && (
						<span className="text-muted-foreground">
							{"\u00B7"} {formatBytes(collection.sizeMb)}
						</span>
					)}
					{collection.lastActivityAt && (
						<span className="text-muted-foreground">
							{"\u00B7"} {formatRelativeTime(collection.lastActivityAt)}
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
			</CardContent>
			<CardFooter className="gap-1 pt-0">
				<Button variant="outline" size="sm" asChild className="flex-1">
					<Link href={`/${organizationSlug}/collections/${collection.slug}`}>
						{t("search.collection.open") || "Open"}
					</Link>
				</Button>
				<div className="gap-1 flex">
					<Button
						variant="ghost"
						size="icon-sm"
						title={t("common.duplicate") || "Duplicate"}
						onClick={() => onDuplicate?.(collection.id)}
					>
						<CopyIcon className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title={t("common.export") || "Export"}
						asChild
					>
						<Link
							href={`/api/companies/${organizationSlug}/collections/${collection.slug}/export`}
						>
							<DownloadIcon className="size-3.5" />
						</Link>
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title={t("common.delete") || "Delete"}
						onClick={() => onDelete?.(collection.id)}
					>
						<Trash2Icon className="size-3.5 text-destructive" />
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}
