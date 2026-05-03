"use client";

import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { toastError } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { DownloadIcon, FileDownIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ExportDocumentsDialogProps {
	organizationId: string;
	slug: string;
}

export function ExportDocumentsDialog({ organizationId, slug }: ExportDocumentsDialogProps) {
	const t = useTranslations("search");
	const [open, setOpen] = useState(false);
	const [format, setFormat] = useState<"json" | "jsonl">("json");
	const [filterBy, setFilterBy] = useState("");

	const exportMutation = useMutation({
		...orpc.search.exportDocuments.mutationOptions(),
		onSuccess: (data) => {
			// Trigger download
			const content =
				format === "json"
					? JSON.stringify(data.documents, null, 2)
					: data.documents.map((d) => JSON.stringify(d)).join("\n");

			const mimeType = format === "json" ? "application/json" : "application/jsonl+x-ndjson";
			const ext = format === "json" ? "json" : "jsonl";

			const blob = new Blob([content], { type: mimeType });
			const url = URL.createObjectURL(blob);
			const a = window.document.createElement("a");
			a.href = url;
			a.download = `${slug}-export.${ext}`;
			a.click();
			URL.revokeObjectURL(url);

			setOpen(false);
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("export.failed"));
		},
	});

	const handleExport = () => {
		exportMutation.mutate({
			organizationId,
			slug,
			format,
			filterBy: filterBy || undefined,
		});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<FileDownIcon className="mr-1 size-4" />
					{t("export.export")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>{t("export.title")}</DialogTitle>
					<DialogDescription>{t("export.description")}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Format selector */}
					<div className="space-y-2">
						<Label>{t("export.format")}</Label>
						<div className="gap-2 flex">
							<Button
								variant={format === "json" ? "default" : "outline"}
								size="sm"
								onClick={() => setFormat("json")}
								className="flex-1"
							>
								JSON
							</Button>
							<Button
								variant={format === "jsonl" ? "default" : "outline"}
								size="sm"
								onClick={() => setFormat("jsonl")}
								className="flex-1"
							>
								JSONL
							</Button>
						</div>
					</div>

					{/* Filter */}
					<div className="space-y-2">
						<Label>{t("export.filterBy")}</Label>
						<Input
							value={filterBy}
							onChange={(e) => setFilterBy(e.target.value)}
							placeholder={t("export.filterPlaceholder")}
						/>
						<p className="text-xs text-muted-foreground">{t("export.filterHint")}</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleExport} disabled={exportMutation.isPending}>
						{exportMutation.isPending ? (
							<Loader2Icon className="mr-1 size-4 animate-spin" />
						) : (
							<DownloadIcon className="mr-1 size-4" />
						)}
						{t("export.download")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
