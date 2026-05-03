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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { toastError } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Papa from "papaparse";
import { useState } from "react";
import * as XLSX from "xlsx";

// ─── Types ──────────────────────────────────────────────────────────────────

type ExportFormat = "csv" | "json" | "jsonl" | "xlsx";
type ExportScope = "all" | "selected" | "filtered";

interface ExportDialogProps {
	organizationId: string;
	slug: string;
	selectedCount: number;
	selectedDocuments: Record<string, unknown>[];
	totalCount: number;
	hasFilter: boolean;
	filterBy?: string;
	trigger?: React.ReactNode;
	onExportComplete?: () => void;
}

// ─── Format helpers ─────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
	if (rows.length === 0) return;
	const csv = Papa.unparse(rows);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	downloadBlob(blob, filename);
}

function exportJSON(rows: Record<string, unknown>[], filename: string) {
	const json = JSON.stringify(rows, null, 2);
	const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
	downloadBlob(blob, filename);
}

function exportJSONL(rows: Record<string, unknown>[], filename: string) {
	const jsonl = rows.map((r) => JSON.stringify(r)).join("\n");
	const blob = new Blob([jsonl], { type: "application/jsonl;charset=utf-8;" });
	downloadBlob(blob, filename);
}

function exportXLSX(rows: Record<string, unknown>[], filename: string) {
	if (rows.length === 0) return;
	const worksheet = XLSX.utils.json_to_sheet(rows);

	// Auto-fit column widths
	const cols = Object.keys(rows[0] ?? {});
	const colWidths = cols.map((col) => {
		const maxLen = Math.max(col.length, ...rows.map((r) => String(r[col] ?? "").length));
		return { wch: Math.min(maxLen + 2, 60) };
	});
	worksheet["!cols"] = colWidths;

	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "Documents");
	const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	downloadBlob(blob, filename);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ExportDialog({
	organizationId,
	slug,
	selectedCount,
	selectedDocuments,
	totalCount,
	hasFilter,
	filterBy,
	trigger,
	onExportComplete,
}: ExportDialogProps) {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [format, setFormat] = useState<ExportFormat>("csv");
	const [scope, setScope] = useState<ExportScope>("all");
	const [exporting, setExporting] = useState(false);

	const exportMutation = useMutation(
		orpc.search.exportDocuments.mutationOptions({
			onError: (error) => {
				toastError(error instanceof Error ? error.message : t("search.export.error"));
				setExporting(false);
			},
			onSuccess: () => {
				setExporting(false);
				setOpen(false);
				onExportComplete?.();
			},
		}),
	);

	const handleExport = async () => {
		// 1. Get the data to export
		let rows: Record<string, unknown>[] | null = null;

		if (scope === "selected") {
			rows = selectedDocuments;
		} else {
			// Fetch all documents from server
			setExporting(true);
			const result = await exportMutation.mutateAsync({
				organizationId,
				slug,
				filterBy: scope === "filtered" && filterBy ? filterBy : undefined,
			});
			rows = result.documents;
			if (result.parseFailures > 0) {
				console.warn(`Export: ${result.parseFailures} documents failed to parse`);
			}
		}

		if (!rows || rows.length === 0) {
			setExporting(false);
			return;
		}

		// 2. Export in the chosen format
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
		const baseFilename = `documents-${slug}-${timestamp}`;

		try {
			switch (format) {
				case "csv":
					exportCSV(rows, `${baseFilename}.csv`);
					break;
				case "json":
					exportJSON(rows, `${baseFilename}.json`);
					break;
				case "jsonl":
					exportJSONL(rows, `${baseFilename}.jsonl`);
					break;
				case "xlsx":
					exportXLSX(rows, `${baseFilename}.xlsx`);
					break;
			}
		} catch (error) {
			toastError(error instanceof Error ? error.message : t("search.export.error"));
		} finally {
			setExporting(false);
			setOpen(false);
			onExportComplete?.();
		}
	};

	const estimatedRows =
		scope === "selected" ? selectedCount : scope === "filtered" ? totalCount : totalCount;

	const defaultTrigger = (
		<Button variant="ghost" size="sm">
			<DownloadIcon className="size-3.5" />
			{t("search.documents.exportCsv")}
		</Button>
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("search.export.title")}</DialogTitle>
					<DialogDescription>{t("search.export.description")}</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					{/* Format selector */}
					<div className="space-y-2">
						<label className="text-sm font-medium">{t("search.export.format")}</label>
						<div className="gap-2 grid grid-cols-2">
							<FormatCard
								selected={format === "csv"}
								onSelect={() => setFormat("csv")}
								title="CSV"
								description={t("search.export.csvDesc")}
							/>
							<FormatCard
								selected={format === "json"}
								onSelect={() => setFormat("json")}
								title="JSON"
								description={t("search.export.jsonDesc")}
							/>
							<FormatCard
								selected={format === "jsonl"}
								onSelect={() => setFormat("jsonl")}
								title="JSONL"
								description={t("search.export.jsonlDesc")}
							/>
							<FormatCard
								selected={format === "xlsx"}
								onSelect={() => setFormat("xlsx")}
								title="XLSX"
								description={t("search.export.xlsxDesc")}
							/>
						</div>
					</div>

					{/* Scope selector */}
					<div className="space-y-2">
						<label className="text-sm font-medium">{t("search.export.scope")}</label>
						<Select value={scope} onValueChange={(v: ExportScope) => setScope(v)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t("search.export.scopeAll")}</SelectItem>
								{selectedCount > 0 && (
									<SelectItem value="selected">
										{t("search.export.scopeSelected")} ({selectedCount} {t("search.export.rows")})
									</SelectItem>
								)}
								{hasFilter && (
									<SelectItem value="filtered">{t("search.export.scopeFiltered")}</SelectItem>
								)}
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							{scope === "all" && t("search.export.scopeAllDesc")}
							{scope === "filtered" && t("search.export.scopeFilteredDesc")}
							{scope === "selected" && t("search.export.scopeSelected") + ` (${selectedCount})`}
							{" — "}
							{formatFileSize(estimatedRows * 1024 * 2)}
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="ghost" onClick={() => setOpen(false)} disabled={exporting}>
						{t("search.documents.cancel")}
					</Button>
					<Button variant="primary" onClick={handleExport} loading={exporting}>
						<DownloadIcon className="size-3.5" />
						{exporting ? t("search.export.exporting") : t("search.export.download")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Format Card sub-component ───────────────────────────────────────────────

function FormatCard({
	selected,
	onSelect,
	title,
	description,
}: {
	selected: boolean;
	onSelect: () => void;
	title: string;
	description: string;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`gap-1 p-3 text-sm flex flex-col items-start rounded-lg border text-left transition-colors ${
				selected
					? "border-primary bg-primary/5 ring-1 ring-primary"
					: "border-input bg-card hover:border-foreground/30"
			}`}
		>
			<span className="font-medium">{title}</span>
			<span className="text-xs text-muted-foreground">{description}</span>
		</button>
	);
}
