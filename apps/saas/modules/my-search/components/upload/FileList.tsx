"use client";

import { Button } from "@repo/ui/components/button";
import { FileTextIcon, GlobeIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatFileSize } from "../lib/format";

interface PendingFile {
	id: string;
	file: File;
	status: "pending" | "uploading" | "done" | "error";
	error?: string;
}

interface PendingUrl {
	id: string;
	url: string;
	status: "pending" | "fetching" | "done" | "error";
	error?: string;
}

interface FileListProps {
	files: PendingFile[];
	urls: PendingUrl[];
	onRemoveFile: (id: string) => void;
	onRemoveUrl: (id: string) => void;
}

export function FileList({ files, urls, onRemoveFile, onRemoveUrl }: FileListProps) {
	const t = useTranslations("mySearch");

	if (files.length === 0 && urls.length === 0) {
		return null;
	}

	return (
		<div className="space-y-2">
			<h4 className="text-sm font-medium text-muted-foreground">{t("selectedItems")}</h4>
			<div className="divide-y rounded-lg border">
				{files.map((item) => (
					<div key={item.id} className="gap-3 px-4 py-3 flex items-center">
						<FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium truncate">{item.file.name}</p>
							<p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
						</div>
						<div className="gap-2 flex items-center">
							{item.status === "uploading" && (
								<span className="text-xs animate-pulse text-muted-foreground">
									{t("uploading")}
								</span>
							)}
							{item.status === "done" && (
								<span className="text-xs text-green-600 dark:text-green-400">{t("uploaded")}</span>
							)}
							{item.status === "error" && item.error && (
								<span
									className="text-xs max-w-[200px] truncate text-destructive"
									title={item.error}
								>
									{item.error}
								</span>
							)}
							{item.status !== "done" && item.status !== "uploading" && (
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 shrink-0"
									onClick={() => onRemoveFile(item.id)}
								>
									<Trash2Icon className="h-3.5 w-3.5" />
								</Button>
							)}
						</div>
					</div>
				))}
				{urls.map((item) => (
					<div key={item.id} className="gap-3 px-4 py-3 flex items-center">
						<GlobeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium truncate">{item.url}</p>
						</div>
						<div className="gap-2 flex items-center">
							{item.status === "fetching" && (
								<span className="text-xs animate-pulse text-muted-foreground">{t("fetching")}</span>
							)}
							{item.status === "done" && (
								<span className="text-xs text-green-600 dark:text-green-400">{t("added")}</span>
							)}
							{item.status === "error" && item.error && (
								<span
									className="text-xs max-w-[200px] truncate text-destructive"
									title={item.error}
								>
									{item.error}
								</span>
							)}
							{item.status !== "done" && item.status !== "fetching" && (
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 shrink-0"
									onClick={() => onRemoveUrl(item.id)}
								>
									<Trash2Icon className="h-3.5 w-3.5" />
								</Button>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
