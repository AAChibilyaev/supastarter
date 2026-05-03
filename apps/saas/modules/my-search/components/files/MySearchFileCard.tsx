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
import { FileTextIcon, GlobeIcon, ImageIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatFileSize } from "../../lib/format";
import { inferFileType } from "./types";
import type { MySearchFileEntry } from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFileCardIcon(type: string) {
	switch (type) {
		case "image":
			return ImageIcon;
		case "url":
			return GlobeIcon;
		default:
			return FileTextIcon;
	}
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface MySearchFileCardProps {
	file: MySearchFileEntry;
	onPreview: (file: MySearchFileEntry) => void;
	onDelete: (file: MySearchFileEntry) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MySearchFileCard({ file, onPreview, onDelete }: MySearchFileCardProps) {
	const t = useTranslations("mySearch");
	const fileType = inferFileType(file);
	const Icon = getFileCardIcon(fileType);

	return (
		<Card
			className="group hover:shadow-md cursor-pointer transition-shadow"
			onClick={() => onPreview(file)}
		>
			<CardHeader className="pb-3">
				<div className="gap-3 flex items-start">
					<div className="p-2 shrink-0 rounded-lg bg-muted">
						<Icon className="size-5 text-muted-foreground" />
					</div>
					<div className="min-w-0 flex-1">
						<CardTitle className="text-sm truncate">{file.originalFilename}</CardTitle>
						<CardDescription className="gap-2 mt-1 flex items-center">
							<Badge status="info" className="text-[10px] uppercase">
								{file.fileType}
							</Badge>
							<span className="text-xs">{formatFileSize(file.fileSize)}</span>
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="gap-2 flex items-center justify-between">
					<div className="gap-1 flex flex-wrap">
						{file.wordCount > 0 && (
							<span className="text-xs text-muted-foreground">
								{file.wordCount.toLocaleString()} {t("files.words")}
							</span>
						)}
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="size-8 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
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
					{new Date(file.uploadedAt).toLocaleDateString()}
				</p>
			</CardContent>
		</Card>
	);
}
