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
import { Label } from "@repo/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { toastError } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import {
	DownloadIcon,
	FileJsonIcon,
	FileSpreadsheetIcon,
	FileTextIcon,
	FilterIcon,
	Table2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ExportFormat = "csv" | "json" | "jsonl" | "xlsx";

type ExportScope = "all" | "filtered" | "selected";

interface ExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	slug: string;
	schemaFields?: string[];
	/** Selected document IDs for selection-aware export */
	selectedIds?: string[];
	/** Estimated total documents in the current filtered view */
	totalFiltered?: number;
	/** Current active filters to apply to the export (field → value) */
	filterBy?: Record<string, unknown>;
	/** Human-readable description of active filters (e.g. "category: shoes") */
	filterDescription?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mimeType: string, isBase64?: boolean) {
	const blob = isBase64
		? base64ToBlob(content, mimeType)
		: new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
	const byteChars = atob(base64);
	const byteArrays: Uint8Array[] = [];
	for (let offset = 0; offset < byteChars.length; offset += 512) {
		const slice = byteChars.slice(offset, offset + 512);
		const byteNums = new Array(slice.length);
		for (let i = 0; i < slice.length; i++) {
			byteNums[i] = slice.charCodeAt(i);
		}
		byteArrays.push(new Uint8Array(byteNums));
	}
	return new Blob(byteArrays, { type: mimeType });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ExportDialog({
	open,
	onOpenChange,
	organizationId,
	slug,
	schemaFields,
	selectedIds,
	totalFiltered,
	filterBy,
	filterDescription,
}: ExportDialogProps) {
	const t = useTranslations();
	const [format, setFormat] = useState<ExportFormat>("csv");
	const [scope, setScope] = useState<ExportScope>(
		filterBy && Object.keys(filterBy).length > 0 ? "filtered" : "all",
	);

	const exportMutation = useMutation(
		orpc.collections.export.mutationOptions({
			onSuccess: (data) => {
				downloadBlob(data.content, data.filename, data.mimeType, data.isBase64);
				onOpenChange(false);
			},
			onError: (err) => {
				toastError(t("search.export.error") || `Export failed: ${err.message}`);
			},
		}),
	);

	const handleExport = () => {
		const documentIds =
			scope === "selected" && selectedIds && selectedIds.length > 0 ? selectedIds : undefined;
		const activeFilterBy =
			scope === "filtered" && filterBy && Object.keys(filterBy).length > 0
				? filterBy
				: undefined;

		exportMutation.mutate({
			organizationId,
			slug,
			format,
			fields: schemaFields && schemaFields.length > 0 ? schemaFields : undefined,
			documentIds,
			filterBy: activeFilterBy,
		});
	};

	const formatIcons: Record<ExportFormat, React.ReactNode> = {
		csv: <FileSpreadsheetIcon className="size-5 text-green-500" />,
		json: <FileJsonIcon className="size-5 text-blue-500" />,
		jsonl: <FileTextIcon className="size-5 text-amber-500" />,
		xlsx: <Table2Icon className="size-5 text-emerald-600" />,
	};

	const isExporting = exportMutation.isPending;
	const hasSelection = selectedIds && selectedIds.length > 0;
	const hasFilters = filterBy && Object.keys(filterBy).length > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="gap-2 inline-flex items-center">
						<DownloadIcon className="size-5" />
						{t("search.export.title") || "Export Documents"}
					</DialogTitle>
					<DialogDescription>
						{t("search.export.description") || "Export documents from this collection"}
					</DialogDescription>
				</DialogHeader>

				{/* Format Selection */}
				<div className="gap-2 grid">
					<Label className="text-sm font-medium">
						{t("search.export.format") || "Format"}
					</Label>
					<RadioGroup
						value={format}
						onValueChange={(v) => setFormat(v as ExportFormat)}
						className="gap-2"
					>
						{(["csv", "json", "jsonl", "xlsx"] as ExportFormat[]).map((fmt) => (
							<label
								key={fmt}
								className={`gap-3 p-2.5 flex cursor-pointer items-center rounded-lg border transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 ${isExporting ? "cursor-not-allowed opacity-50" : ""}`}
							>
								<RadioGroupItem value={fmt} disabled={isExporting} />
								<div className="gap-2 flex items-center">
									{formatIcons[fmt]}
									<div>
										<p className="font-medium text-sm">{fmt.toUpperCase()}</p>
										<p className="text-xs text-muted-foreground">
											{fmt === "csv"
												? t("search.export.csvDesc") ||
													"Excel-compatible, best for spreadsheets"
												: fmt === "json"
													? t("search.export.jsonDesc") ||
														"Pretty-printed JSON, best for APIs"
													: fmt === "jsonl"
														? t("search.export.jsonlDesc") ||
															"JSON Lines, best for large datasets"
														: t("search.export.xlsxDesc") ||
															"Formatted Excel workbook (.xlsx)"}
										</p>
									</div>
								</div>
							</label>
						))}
					</RadioGroup>
				</div>

				{/* Scope Selection */}
				<div className="gap-2 grid">
					<Label className="text-sm font-medium">
						{t("search.export.scope") || "Scope"}
					</Label>
					<RadioGroup
						value={scope}
						onValueChange={(v) => setScope(v as ExportScope)}
						className="gap-2"
					>
						<label
							className={`gap-3 p-2.5 flex cursor-pointer items-center rounded-lg border transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 ${isExporting ? "cursor-not-allowed opacity-50" : ""}`}
						>
							<RadioGroupItem value="all" disabled={isExporting} />
							<div className="flex flex-col">
								<p className="font-medium text-sm">
									{t("search.export.scopeAll") || "All documents"}
								</p>
								<p className="text-xs text-muted-foreground">
									{totalFiltered != null
										? `${totalFiltered} documents`
										: t("search.export.scopeAllDesc") ||
											"Everything in this collection"}
								</p>
							</div>
						</label>
						{hasFilters && (
							<label
								className={`gap-3 p-2.5 flex cursor-pointer items-center rounded-lg border transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 ${isExporting ? "cursor-not-allowed opacity-50" : ""}`}
							>
								<RadioGroupItem value="filtered" disabled={isExporting} />
								<div className="gap-2 flex flex-col">
									<div className="gap-1.5 inline-flex items-center">
										<FilterIcon className="size-3.5 text-primary" />
										<p className="font-medium text-sm">
											{t("search.export.scopeFiltered") || "Filtered only"}
										</p>
									</div>
									<p className="text-xs text-muted-foreground">
										{filterDescription ||
											t("search.export.scopeFilteredDesc") ||
											"Only documents matching current filters"}
									</p>
								</div>
							</label>
						)}
						{hasSelection && (
							<label
								className={`gap-3 p-2.5 flex cursor-pointer items-center rounded-lg border transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 ${isExporting ? "cursor-not-allowed opacity-50" : ""}`}
							>
								<RadioGroupItem value="selected" disabled={isExporting} />
								<div className="flex flex-col">
									<p className="font-medium text-sm">
										{t("search.export.scopeSelected") || "Selected rows"}
									</p>
									<p className="text-xs text-muted-foreground">
										{selectedIds?.length} {t("search.export.rows") || "rows"}
									</p>
								</div>
							</label>
						)}
					</RadioGroup>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isExporting}
					>
						{t("common.cancel") || "Cancel"}
					</Button>
					<Button variant="primary" onClick={handleExport} disabled={isExporting}>
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
