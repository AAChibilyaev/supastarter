"use client";

import { Button } from "@repo/ui/components/button";
import { ClipboardPasteIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { ParsedImportData } from "./ImportPreview";

// ─── Helpers ────────────────────────────────────────────────────────────────

function parsePastedData(text: string): ParsedImportData {
	const lines = text.split(/\r?\n/).filter((l) => l.trim());

	if (lines.length < 2) {
		return { columns: [], rows: [], totalRows: 0 };
	}

	// Detect delimiter from first line
	const firstLine = lines[0];
	const tabCount = (firstLine.match(/\t/g) || []).length;
	const commaCount = (firstLine.match(/,/g) || []).length;

	// Prefer tab for pasted data (Excel copies as TSV)
	const delimiter = tabCount >= commaCount ? "\t" : ",";

	const rawColumns = firstLine
		.split(delimiter)
		.map((c) => c.trim().replace(/^["']|["']$/g, ""));

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

// ─── Component ──────────────────────────────────────────────────────────────

interface ImportPasteProps {
	onParse: (data: ParsedImportData) => void;
	disabled?: boolean;
}

export function ImportPaste({ onParse, disabled }: ImportPasteProps) {
	const t = useTranslations();
	const [pastedText, setPastedText] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleParse = () => {
		if (!pastedText.trim()) {
			setError(t("search.import.pasteEmpty") || "Please paste data first");
			return;
		}

		setError(null);
		const result = parsePastedData(pastedText);

		if (result.columns.length === 0) {
			setError(
				t("search.import.pasteInvalid") ||
					"Could not parse pasted data. Make sure it has a header row and at least one data row.",
			);
			return;
		}

		onParse(result);
	};

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<p className="font-medium text-sm">
					{t("search.import.pasteFromExcel") || "Paste from Excel/Sheets"}
				</p>
				<p className="text-xs text-muted-foreground">
					{t("search.import.pasteInstructions") ||
						"Copy cells from Excel, Google Sheets, or Numbers, then paste below"}
				</p>
				<textarea
					value={pastedText}
					onChange={(e) => setPastedText(e.target.value)}
					placeholder={
						t("search.import.pastePlaceholder") ||
						"Paste your data here (Ctrl+V)...\n\nExample:\nname\tprice\tcategory\nWidget A\t29.99\tTools\nWidget B\t49.99\tTools"
					}
					disabled={disabled}
					className="font-mono h-40 min-h-[120px] w-full resize-y rounded-md border bg-background p-3 text-xs"
					spellCheck={false}
				/>
			</div>

			{error && <p className="text-xs text-destructive">{error}</p>}

			<div className="gap-2 flex justify-end">
				<Button
					variant="primary"
					onClick={handleParse}
					disabled={disabled || !pastedText.trim()}
				>
					<ClipboardPasteIcon className="size-4" />
					{t("search.import.parsePaste") || "Parse Data"}
				</Button>
			</div>
		</div>
	);
}
