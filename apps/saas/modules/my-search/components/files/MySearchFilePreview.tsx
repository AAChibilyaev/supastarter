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

import { formatFileSize } from "../../lib/format";
import { inferFileType } from "./types";
import type { MySearchFileEntry } from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFileMetaIcon(type: string) {
	switch (type) {
		case "image":
			return ImageIcon;
		case "url":
			return GlobeIcon;
		default:
			return FileTextIcon;
	}
}

function getFileTypeLabel(fileType: string): string {
	switch (fileType) {
		case "pdf":
			return "PDF";
		case "docx":
			return "DOCX";
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

interface MySearchFilePreviewProps {
	file: MySearchFileEntry;
	onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MySearchFilePreview({ file, onClose }: MySearchFilePreviewProps) {
	const t = useTranslations("mySearch");
	const Icon = getFileMetaIcon(inferFileType(file));

	const metadata = useMemo(
		() => [
			{ label: t("files.type"), value: getFileTypeLabel(file.fileType) },
			{ label: t("files.size"), value: formatFileSize(file.fileSize) },
			...(file.wordCount > 0
				? [{ label: t("files.words"), value: file.wordCount.toLocaleString() }]
				: []),
			{
				label: t("files.uploaded"),
				value: new Date(file.uploadedAt).toLocaleString(),
			},
		],
		[file, t],
	);

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<div className="gap-3 flex items-center">
						<div className="p-2 rounded-lg bg-muted">
							<Icon className="size-6 text-muted-foreground" />
						</div>
						<div className="min-w-0 flex-1">
							<DialogTitle className="truncate">{file.originalFilename}</DialogTitle>
							<DialogDescription className="gap-2 mt-0.5 flex items-center">
								<Badge status="info">{file.fileType}</Badge>
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
						{file.fileType === "image"
							? t("files.previewImage")
							: file.fileType === "url"
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
