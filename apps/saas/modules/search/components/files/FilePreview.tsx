"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { FileIcon, FileTextIcon, GlobeIcon, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { FileEntry } from "./FileTable";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / Math.pow(1024, i);
	return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getFileMetaIcon(type: FileEntry["type"]) {
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

function getFileTypeLabel(type: FileEntry["type"]): string {
	switch (type) {
		case "pdf":
			return "PDF";
		case "docx":
			return "DOCX";
		case "txt":
			return "Text";
		case "csv":
			return "CSV";
		case "json":
			return "JSON";
		case "md":
			return "Markdown";
		case "html":
			return "HTML";
		case "url":
			return "Web Page";
		case "image":
			return "Image";
		default:
			return "File";
	}
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface FilePreviewProps {
	file: FileEntry;
	onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FilePreview({ file, onClose }: FilePreviewProps) {
	const t = useTranslations("search");
	const Icon = getFileMetaIcon(file.type);

	const metadata = useMemo(
		() => [
			{ label: t("files.type"), value: getFileTypeLabel(file.type) },
			{ label: t("files.size"), value: formatFileSize(file.sizeBytes) },
			...(file.wordCount != null
				? [{ label: t("files.words"), value: file.wordCount.toLocaleString() }]
				: []),
			...(file.pageCount != null
				? [{ label: t("files.pages"), value: file.pageCount.toLocaleString() }]
				: []),
			{
				label: t("files.uploaded"),
				value: new Date(file.createdAt).toLocaleString(),
			},
		],
		[file, t],
	);

	const statusColor =
		file.status === "indexed" ? "success" : file.status === "processing" ? "warning" : "error";

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<div className="gap-3 flex items-center">
						<div className="p-2 rounded-lg bg-muted">
							<Icon className="size-6 text-muted-foreground" />
						</div>
						<div className="min-w-0 flex-1">
							<DialogTitle className="truncate">{file.name}</DialogTitle>
							<DialogDescription className="gap-2 mt-0.5 flex items-center">
								<Badge status={statusColor}>{file.status}</Badge>
								<span className="text-xs">{file.mimeType}</span>
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				{/* Metadata grid */}
				<div className="gap-2 grid grid-cols-2">
					{metadata.map(({ label, value }) => (
						<div key={label} className="p-3 space-y-1 rounded-lg bg-muted/50">
							<p className="text-xs text-muted-foreground">{label}</p>
							<p className="font-medium text-sm truncate">{value}</p>
						</div>
					))}
				</div>

				{/* Content preview area */}
				<div className="p-4 flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30">
					<FileIcon className="size-10 mb-2 text-muted-foreground/40" />
					<p className="text-sm text-muted-foreground">
						{file.type === "image"
							? t("files.previewImage")
							: file.type === "url"
								? t("files.previewUrl")
								: t("files.previewGeneric")}
					</p>
				</div>

				{/* Close button */}
				<div className="flex justify-end">
					<Button variant="outline" onClick={onClose}>
						{t("files.close")}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
