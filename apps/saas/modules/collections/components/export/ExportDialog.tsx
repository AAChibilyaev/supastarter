"use client";

import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { toastError } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { DownloadIcon, FileJsonIcon, FileSpreadsheetIcon, FileTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ExportFormat = "csv" | "json" | "jsonl";

interface ExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	slug: string;
	schemaFields?: string[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ExportDialog({
	open,
	onOpenChange,
	organizationId,
	slug,
	schemaFields,
}: ExportDialogProps) {
	const t = useTranslations();
	const [format, setFormat] = useState<ExportFormat>("csv");

	const exportMutation = useMutation(
		orpc.collections.export.mutationOptions({
			onSuccess: (data) => {
				// Trigger file download
				const blob = new Blob([data.content], { type: data.mimeType });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = data.filename;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				onOpenChange(false);
			},
			onError: (err) => {
				toastError(
					t("search.export.error") || `Export failed: ${err.message}`,
				);
			},
		}),
	);

	const handleExport = () => {
		exportMutation.mutate({
			organizationId,
			slug,
			format,
			fields: schemaFields && schemaFields.length > 0 ? schemaFields : undefined,
		});
	};

	const formatIcons: Record<ExportFormat, React.ReactNode> = {
		csv: <FileSpreadsheetIcon className="size-5 text-green-500" />,
		json: <FileJsonIcon className="size-5 text-blue-500" />,
		jsonl: <FileTextIcon className="size-5 text-amber-500" />,
	};

	const isExporting = exportMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="gap-2 inline-flex items-center">
						<DownloadIcon className="size-5" />
						{t("search.export.title") || "Export Documents"}
					</DialogTitle>
					<DialogDescription>
						{t("search.export.description") ||
							"Export all documents from this collection"}
					</DialogDescription>
				</DialogHeader>

				<RadioGroup
					value={format}
					onValueChange={(v) => setFormat(v as ExportFormat)}
					className="gap-3"
				>
					{(["csv", "json", "jsonl"] as ExportFormat[]).map((fmt) => (
						<label
							key={fmt}
							className={`gap-3 p-3 flex items-center rounded-lg border has-[:checked]:border-primary has-[:checked]:bg-primary/5 cursor-pointer transition-colors ${isExporting ? "opacity-50 cursor-not-allowed" : ""}`}
						>
							<RadioGroupItem value={fmt} disabled={isExporting} />
							<div className="gap-2 flex items-center">
								{formatIcons[fmt]}
								<div>
									<p className="font-medium text-sm">
										{fmt.toUpperCase()}
									</p>
									<p className="text-xs text-muted-foreground">
										{fmt === "csv"
											? t("search.export.csvDesc") ||
												"Excel-compatible, best for spreadsheets"
											: fmt === "json"
												? t("search.export.jsonDesc") ||
													"Pretty-printed JSON, best for APIs"
												: t("search.export.jsonlDesc") ||
													"JSON Lines, best for large datasets"}
									</p>
								</div>
							</div>
						</label>
					))}
				</RadioGroup>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isExporting}
					>
						{t("common.cancel") || "Cancel"}
					</Button>
					<Button
						variant="primary"
						onClick={handleExport}
						disabled={isExporting}
					>
						<DownloadIcon className="size-4" />
						{isExporting
							? t("search.export.exporting") || "Exporting..."
							: t("search.export.download") || "Download"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
