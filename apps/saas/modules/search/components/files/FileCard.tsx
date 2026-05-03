"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { FileIcon, FileTextIcon, GlobeIcon, ImageIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { FileEntry } from "./FileTable";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / Math.pow(1024, i);
	return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getFileCardIcon(type: FileEntry["type"]) {
	switch (type) {
		case "image":
			return ImageIcon;
		case "url":
			return GlobeIcon;
		case "pdf":
		case "docx":
		case "txt":
		case "csv":
		case "json":
		case "md":
		default:
			return FileTextIcon;
	}
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface FileCardProps {
	file: FileEntry;
	onPreview: (file: FileEntry) => void;
	onDelete: (file: FileEntry) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FileCard({ file, onPreview, onDelete }: FileCardProps) {
	const t = useTranslations("search");
	const Icon = getFileCardIcon(file.type);

	const statusColor =
		file.status === "indexed"
			? "success"
			: file.status === "processing"
				? "warning"
				: "error";

	return (
		<Card
			className="group cursor-pointer transition-shadow hover:shadow-md"
			onClick={() => onPreview(file)}
		>
			<CardHeader className="pb-3">
				<div className="gap-3 flex items-start">
					<div className="p-2 shrink-0 rounded-lg bg-muted">
						<Icon className="size-5 text-muted-foreground" />
					</div>
					<div className="min-w-0 flex-1">
						<CardTitle className="text-sm truncate">{file.name}</CardTitle>
						<CardDescription className="flex gap-2 items-center mt-1">
							<Badge status={statusColor} className="text-[10px] uppercase">
								{file.type}
							</Badge>
							<span className="text-xs">{formatFileSize(file.sizeBytes)}</span>
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="gap-2 flex items-center justify-between">
					<div className="gap-1 flex flex-wrap">
						{file.wordCount != null && (
							<span className="text-xs text-muted-foreground">
								{file.wordCount.toLocaleString()} {t("files.words")}
							</span>
						)}
						{file.pageCount != null && (
							<span className="text-xs text-muted-foreground">
								{file.pageCount} {t("files.pages")}
							</span>
						)}
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="opacity-0 size-8 p-0 text-muted-foreground group-hover:opacity-100 hover:text-destructive transition-opacity"
						onClick={(e) => {
							e.stopPropagation();
							onDelete(file);
						}}
					>
						<Trash2Icon className="size-4" />
						<span className="sr-only">{t("files.delete")}</span>
					</Button>
				</div>
				<p className="mt-1 text-xs text-muted-foreground">
					{new Date(file.createdAt).toLocaleDateString()}
				</p>
			</CardContent>
		</Card>
	);
}
