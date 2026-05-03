"use client";

import { Button } from "@repo/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { FileJsonIcon, FileSpreadsheetIcon, FileTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedImportData {
	columns: string[];
	rows: Record<string, string>[];
	totalRows: number;
}

interface ImportPreviewProps {
	data: ParsedImportData;
	/** Mapping from file columns to target schema fields */
	columnMapping: Record<string, string>;
	onColumnMappingChange: (mapping: Record<string, string>) => void;
	schemaFields: string[];
	onImport: () => void;
	isImporting: boolean;
	fileType?: "csv" | "json" | "tsv" | "excel" | "paste";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getIcon(fileType: ImportPreviewProps["fileType"]) {
	switch (fileType) {
		case "json":
			return <FileJsonIcon className="size-5 text-blue-500" />;
		case "excel":
		case "csv":
		case "tsv":
			return <FileSpreadsheetIcon className="size-5 text-green-500" />;
		default:
			return <FileTextIcon className="size-5 text-muted-foreground" />;
	}
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ImportPreview({
	data,
	columnMapping,
	onColumnMappingChange,
	schemaFields,
	onImport,
	isImporting,
	fileType,
}: ImportPreviewProps) {
	const t = useTranslations();
	const previewRows = data.rows.slice(0, 10);
	const hasMoreRows = data.totalRows > 10;

	const handleMappingChange = (fileColumn: string, schemaField: string) => {
		onColumnMappingChange({
			...columnMapping,
			[fileColumn]: schemaField,
		});
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="gap-2 flex items-center">
				{getIcon(fileType)}
				<div>
					<p className="font-medium text-sm">
						{t("search.import.previewTitle") || "Preview"}
					</p>
					<p className="text-xs text-muted-foreground">
						{t("search.import.previewCount", {
							shown: previewRows.length,
							total: data.totalRows,
						}) || `${previewRows.length} of ${data.totalRows} rows`}
						{hasMoreRows && ` — ${t("search.import.previewOnlyFirst") || "first 10 shown"}`}
					</p>
				</div>
			</div>

			{/* Column Mapping */}
			<div className="space-y-2">
				<p className="font-medium text-sm">
					{t("search.import.columnMapping") || "Column Mapping"}
				</p>
				<div className="gap-2 flex flex-wrap">
					{data.columns.map((col) => (
						<div key={col} className="gap-1.5 inline-flex items-center text-xs">
							<span className="font-medium text-muted-foreground">{col}:</span>
							<select
								value={columnMapping[col] ?? ""}
								onChange={(e) => handleMappingChange(col, e.target.value)}
								className="h-7 max-w-[160px] rounded-md border bg-background px-2 text-xs"
							>
								<option value="">
									{t("search.import.skip") || "— Skip —"}
								</option>
								{schemaFields.map((field) => (
									<option key={field} value={field}>
										{field}
									</option>
								))}
							</select>
						</div>
					))}
				</div>
			</div>

			{/* Preview Table */}
			<div className="max-h-80 overflow-auto rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-10 text-xs text-muted-foreground">#</TableHead>
							{data.columns.map((col) => (
								<TableHead key={col} className="text-xs whitespace-nowrap">
									{columnMapping[col] || (
										<span className="text-muted-foreground">{col}</span>
									)}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{previewRows.map((row, i) => (
							<TableRow key={i}>
								<TableCell className="font-mono text-xs text-muted-foreground">
									{i + 1}
								</TableCell>
								{data.columns.map((col) => (
									<TableCell
										key={col}
										className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-xs"
									>
										{row[col] ?? ""}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Actions */}
			<div className="gap-2 flex justify-end">
				<Button
					variant="primary"
					onClick={onImport}
					disabled={isImporting || data.rows.length === 0}
				>
					{isImporting
						? t("search.import.importing") || "Importing..."
						: t("search.import.import", { count: data.totalRows }) ||
							`Import ${data.totalRows} rows`}
				</Button>
			</div>
		</div>
	);
}
