"use client";

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
	DownloadIcon,
	ImportIcon,
	Settings2Icon,
	SlidersHorizontalIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { CollectionStats } from "./CollectionStats";

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

// ─── Component ───────────────────────────────────────────────────────────────

interface CollectionCardProps {
	collection: CollectionData;
	organizationSlug: string;
	onDelete?: (id: string) => void;
	onDuplicate?: (id: string) => void;
	onImport?: (id: string) => void;
	onExport?: (slug: string) => void;
	onSchema?: (slug: string) => void;
}

export function CollectionCard({
	collection,
	organizationSlug,
	onDelete,
	onDuplicate,
	onImport,
	onExport,
	onSchema,
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
				<CollectionStats
					numDocuments={collection.numDocuments}
					sizeMb={collection.sizeMb}
					lastActivityAt={collection.lastActivityAt}
					usagePercent={usagePercent}
				/>
			</CardContent>
			<CardFooter className="gap-1 pt-0">
				<Button variant="outline" size="sm" asChild className="flex-1">
					<Link href={`/${organizationSlug}/collections/${collection.slug}`}>
						{t("search.collection.open")}
					</Link>
				</Button>
				<div className="gap-1 flex">
					<Button
						variant="ghost"
						size="icon"
						title={t("search.import.title")}
						onClick={() => onImport?.(collection.id)}
					>
						<ImportIcon className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						title={t("search.collection.schema")}
						onClick={() => onSchema?.(collection.slug)}
					>
						<Settings2Icon className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						title={t("search.collection.collectionSettings")}
						asChild
					>
						<Link href={`/${organizationSlug}/collections/${collection.slug}/settings`}>
							<SlidersHorizontalIcon className="size-3.5" />
						</Link>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						title={t("common.duplicate")}
						onClick={() => onDuplicate?.(collection.id)}
					>
						<CopyIcon className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						title={t("common.export")}
						onClick={() => onExport?.(collection.slug)}
					>
						<DownloadIcon className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						title={t("common.delete")}
						onClick={() => onDelete?.(collection.id)}
					>
						<Trash2Icon className="size-3.5 text-destructive" />
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}
