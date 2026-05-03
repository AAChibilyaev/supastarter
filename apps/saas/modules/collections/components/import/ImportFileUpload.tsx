"use client";

import { Button } from "@repo/ui/components/button";
import { UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

import type { ParsedImportData } from "./ImportPreview";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ImportFileType = "csv" | "json" | "tsv";

interface ImportFileUploadProps {
	onParse: (data: ParsedImportData, fileType: ImportFileType) => void;
	disabled?: boolean;
}

// ─── Parsers ────────────────────────────────────────────────────────────────

function guessDelimiter(firstLine: string): string {
	const commaCount = (firstLine.match(/,/g) || []).length;
	const tabCount = (firstLine.match(/\t/g) || []).length;
	const semicolonCount = (firstLine.match(/;/g) || []).length;

	if (tabCount > commaCount && tabCount > semicolonCount) return "\t";
	if (semicolonCount > commaCount) return ";";
	return ",";
}

function parseCSV(text: string, delimiter = ","): ParsedImportData {
	const lines = text.split(/\r?\n/).filter(Boolean);
	if (lines.length < 2) {
		return { columns: [], rows: [], totalRows: 0 };
	}

	const rawColumns = lines[0].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
	const rows = lines.slice(1).map((line) => {
		const values = line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""));
		const row: Record<string, string> = {};
		rawColumns.forEach((col, i) => {
			row[col] = values[i] ?? "";
		});
		return row;
	});

	return { columns: rawColumns, totalRows: rows.length, rows };
}

function parseJSON(text: string): ParsedImportData {
	const data = JSON.parse(text);
	const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? data.results ?? []);
	if (!Array.isArray(arr) || arr.length === 0) {
		return { columns: [], rows: [], totalRows: 0 };
	}

	const columns = Object.keys(arr[0]);
	const rows = arr.map((item: Record<string, unknown>) => {
		const row: Record<string, string> = {};
		columns.forEach((col) => {
			const val = item[col];
			row[col] = val == null ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
		});
		return row;
	});

	return { columns, totalRows: rows.length, rows };
}

function detectFileType(fileName: string): ImportFileType {
	const ext = fileName.toLowerCase().split(".").pop() || "";
	if (ext === "json") return "json";
	if (ext === "tsv") return "tsv";
	return "csv";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ImportFileUpload({ onParse, disabled }: ImportFileUploadProps) {
	const t = useTranslations();
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			const file = acceptedFiles[0];
			if (!file) return;

			setError(null);
			setIsProcessing(true);

			const reader = new FileReader();
			const fileType = detectFileType(file.name);

			reader.onload = (e) => {
				try {
					const text = e.target?.result as string;
					let result: ParsedImportData;

					switch (fileType) {
						case "json":
							result = parseJSON(text);
							break;
						case "tsv":
							result = parseCSV(text, "\t");
							break;
						default:
							// Sniff delimiter
							const firstLine = text.split(/\r?\n/)[0];
							const delimiter = guessDelimiter(firstLine);
							result = parseCSV(text, delimiter);
							break;
					}

					if (result.columns.length === 0) {
						setError(t("search.import.noColumnsError") || "No columns found in file");
					} else {
						onParse(result, fileType);
					}
				} catch (err) {
					setError(
						t("search.import.parseError") ||
							`Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`,
					);
				} finally {
					setIsProcessing(false);
				}
			};

			reader.onerror = () => {
				setError(t("search.import.readError") || "Failed to read file");
				setIsProcessing(false);
			};

			reader.readAsText(file);
		},
		[onParse, t],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"text/csv": [".csv"],
			"text/tab-separated-values": [".tsv"],
			"application/json": [".json"],
			"text/plain": [".csv", ".tsv"],
		},
		multiple: false,
		disabled: disabled || isProcessing,
	});

	return (
		<div className="space-y-4">
			<div
				{...getRootProps()}
				className={`p-8 cursor-pointer rounded-lg border-2 border-dashed text-center transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"} ${disabled || isProcessing ? "cursor-not-allowed opacity-50" : ""}`}
			>
				<input {...getInputProps()} />
				<UploadIcon className="mb-2 size-8 mx-auto text-muted-foreground" />
				{isDragActive ? (
					<p className="font-medium text-sm">
						{t("search.import.dropHere") || "Drop your file here..."}
					</p>
				) : (
					<>
						<p className="font-medium text-sm">
							{t("search.import.dragAndDrop") || "Drag & drop a file here"}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("search.import.supportedFormats") || "CSV, TSV, or JSON — up to 10,000 rows"}
						</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-3"
							disabled={disabled || isProcessing}
						>
							{isProcessing
								? t("search.import.processing") || "Processing..."
								: t("search.import.selectFile") || "Select File"}
						</Button>
					</>
				)}
			</div>

			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
}
