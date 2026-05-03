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
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

interface ImportValidationResult {
	imported: number;
	skipped: number;
	errors: string[];
	warnings: string[];
	dryRun: boolean;
}

interface ImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImport: (
		data: string,
		format: "csv" | "json",
		dryRun: boolean,
	) => Promise<ImportValidationResult>;
	isGlobal?: boolean;
}

export function SynonymImportDialog({ open, onOpenChange, onImport, isGlobal }: ImportDialogProps) {
	const t = useTranslations();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [fileContent, setFileContent] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string>("");
	const [detectedFormat, setDetectedFormat] = useState<"csv" | "json" | null>(null);
	const [importing, setImporting] = useState(false);
	const [result, setResult] = useState<ImportValidationResult | null>(null);

	const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setFileName(file.name);
		setResult(null);

		// Detect format from extension
		if (file.name.endsWith(".csv")) {
			setDetectedFormat("csv");
		} else if (file.name.endsWith(".json")) {
			setDetectedFormat("json");
		} else {
			// Try to detect from content
			setDetectedFormat(null);
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			const content = event.target?.result as string;
			setFileContent(content);

			// Auto-detect format from content if extension didn't give it
			if (!file.name.endsWith(".csv") && !file.name.endsWith(".json")) {
				const trimmed = content.trim();
				if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
					setDetectedFormat("json");
				} else if (trimmed.includes(",")) {
					setDetectedFormat("csv");
				}
			}
		};
		reader.readAsText(file);
	}, []);

	const handleImport = useCallback(async () => {
		if (!fileContent || !detectedFormat) return;

		setImporting(true);
		setResult(null);

		try {
			// First do a dry run
			const dryRunResult = await onImport(fileContent, detectedFormat, true);
			setResult(dryRunResult);

			if (dryRunResult.errors.length > 0) {
				setImporting(false);
				return;
			}

			// If dry run looks good, ask for confirmation via the result display
			// User clicks "Confirm import" which triggers the real import
		} catch (err) {
			toastError(err instanceof Error ? err.message : t("search.synonyms.importError"));
		} finally {
			setImporting(false);
		}
	}, [fileContent, detectedFormat, onImport, t]);

	const handleConfirmImport = useCallback(async () => {
		if (!fileContent || !detectedFormat) return;

		setImporting(true);
		try {
			const realResult = await onImport(fileContent, detectedFormat, false);

			if (realResult.errors.length > 0) {
				toastError(realResult.errors[0]);
			} else {
				toastSuccess(
					t("search.synonyms.importSuccess", {
						count: realResult.imported,
					}),
				);
				onOpenChange(false);
				setFileContent(null);
				setFileName("");
				setDetectedFormat(null);
				setResult(null);
			}
		} catch (err) {
			toastError(err instanceof Error ? err.message : t("search.synonyms.importError"));
		} finally {
			setImporting(false);
		}
	}, [fileContent, detectedFormat, onImport, onOpenChange, t]);

	const handleReset = useCallback(() => {
		setFileContent(null);
		setFileName("");
		setDetectedFormat(null);
		setResult(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, []);

	const section = isGlobal ? "search.globalSynonyms" : "search.synonyms";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline">{t(`${section}.import`)}</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t(`${section}.importTitle`)}</DialogTitle>
					<DialogDescription>{t(`${section}.importDescription`)}</DialogDescription>
				</DialogHeader>

				{!result && (
					<div className="space-y-4 py-4">
						<div
							className="p-8 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center transition-colors hover:border-primary/50"
							onClick={() => fileInputRef.current?.click()}
						>
							<input
								ref={fileInputRef}
								type="file"
								accept=".csv,.json"
								className="hidden"
								onChange={handleFileSelect}
							/>
							{fileName ? (
								<div className="space-y-1">
									<p className="font-medium">{fileName}</p>
									<p className="text-sm text-foreground/60">
										{detectedFormat?.toUpperCase()} format detected
									</p>
								</div>
							) : (
								<div className="space-y-1">
									<p className="font-medium">{t(`${section}.importDropzone`)}</p>
									<p className="text-xs text-foreground/40">.csv .json</p>
								</div>
							)}
						</div>
					</div>
				)}

				{result && (
					<div className="space-y-4 py-4">
						<div className="p-4 space-y-2 rounded-lg border">
							{result.errors.length > 0 && (
								<div className="space-y-1">
									<p className="text-sm font-medium text-destructive">Errors:</p>
									{result.errors.map((err, i) => (
										<p key={i} className="text-sm text-destructive/80">
											{err}
										</p>
									))}
								</div>
							)}

							{result.dryRun && result.errors.length === 0 && (
								<p className="text-sm">
									{t("search.synonyms.importDryRun", {
										count: result.imported,
									})}
								</p>
							)}

							{result.warnings.length > 0 && (
								<div className="space-y-1">
									<p className="text-sm font-medium text-amber-500">Warnings:</p>
									{result.warnings.map((warn, i) => (
										<p key={i} className="text-sm text-amber-500/80">
											{warn}
										</p>
									))}
								</div>
							)}

							{!result.dryRun && !result.errors.length && (
								<p className="text-sm text-green-600">
									{t("search.synonyms.importSuccess", {
										count: result.imported,
									})}
								</p>
							)}
						</div>
					</div>
				)}

				<DialogFooter className="gap-2">
					{!result && fileContent && detectedFormat && (
						<>
							<Button variant="outline" onClick={handleReset}>
								Reset
							</Button>
							<Button onClick={handleImport} loading={importing}>
								Preview
							</Button>
						</>
					)}

					{result && result.errors.length === 0 && result.dryRun && (
						<Button onClick={handleConfirmImport} loading={importing}>
							Confirm import
						</Button>
					)}

					{(result && !result.dryRun) || (result && result.errors.length > 0) ? (
						<Button
							variant="outline"
							onClick={() => {
								onOpenChange(false);
								handleReset();
							}}
						>
							Close
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
