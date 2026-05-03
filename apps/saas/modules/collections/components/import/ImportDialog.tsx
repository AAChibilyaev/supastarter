"use client";

import { Button } from "@repo/ui/components/button";
import { Progress } from "@repo/ui/components/progress";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcwIcon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

import type { ImportFileType } from "./ImportFileUpload";
import { ImportFileUpload } from "./ImportFileUpload";
import { ImportPaste } from "./ImportPaste";
import { ImportPreview, type ParsedImportData } from "./ImportPreview";

// ─── Constants ──────────────────────────────────────────────────────────────

const CHUNK_SIZE = 500;

// ─── Types ──────────────────────────────────────────────────────────────────

interface ImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	slug: string;
	/** Schema field names available for mapping */
	schemaFields: string[];
}

interface ImportProgress {
	current: number;
	total: number;
	status: "idle" | "importing" | "done" | "error";
}

const TAB_FILE = "file";
const TAB_PASTE = "paste";

// ─── Component ──────────────────────────────────────────────────────────────

export function ImportDialog({
	open,
	onOpenChange,
	organizationId,
	slug,
	schemaFields: schemaFieldNames,
}: ImportDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [parsedData, setParsedData] = useState<ParsedImportData | null>(null);
	const [fileType, setFileType] = useState<ImportFileType | "paste">("csv");
	const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
	const [activeTab, setActiveTab] = useState(TAB_FILE);
	const [progress, setProgress] = useState<ImportProgress>({
		current: 0,
		total: 0,
		status: "idle",
	});
	const [importedCount, setImportedCount] = useState(0);
	const abortRef = useRef(false);
	const importedIdsRef = useRef<string[]>([]);

	// ── Delete batch mutation (for undo) ──────────────────────────────────

	const deleteBatchMutation = useMutation(
		orpc.collections.documents.deleteBatch.mutationOptions({
			onSuccess: (result) => {
				toastSuccess(
					t("search.import.undoSuccess", { count: result.count }) ??
						`Undo successful — ${result.count} documents removed`,
				);
				importedIdsRef.current = [];
				setImportedCount(0);
				setProgress({ current: 0, total: 0, status: "idle" });
				void queryClient.invalidateQueries({
					queryKey: orpc.collections.documents.list.key(),
				});
				handleClose();
			},
			onError: (err) => {
				toastError(
					t("search.import.undoError") ??
						`Undo failed: ${err instanceof Error ? err.message : "Unknown error"}`,
				);
			},
		}),
	);

	// ── Auto-map columns on data change ──────────────────────────────────────

	const handleParse = (data: ParsedImportData, type?: ImportFileType | "paste") => {
		setParsedData(data);

		if (type) {
			setFileType(type as ImportFileType);
		}

		// Auto-map: find best matching schema fields
		const mapping: Record<string, string> = {};
		for (const col of data.columns) {
			const colLower = col.toLowerCase().replace(/[^a-z0-9]/g, "");
			const match = schemaFieldNames.find(
				(f) =>
					f.toLowerCase() === colLower ||
					f.toLowerCase().replace(/[^a-z0-9]/g, "") === colLower ||
					colLower.includes(f.toLowerCase()) ||
					f.toLowerCase().includes(colLower),
			);
			if (match) {
				mapping[col] = match;
			}
		}
		setColumnMapping(mapping);
	};

	// ── Chunked import mutation ──────────────────────────────────────────────

	const importChunkMutation = useMutation(
		orpc.collections.documents.createBatch.mutationOptions({}),
	);

	const handleImport = useCallback(async () => {
		if (!parsedData) return;

		// Build all documents from mapped columns
		const allDocuments = parsedData.rows.map((row) => {
			const doc: Record<string, string> = {};
			for (const [fileCol, schemaField] of Object.entries(columnMapping)) {
				if (schemaField) {
					doc[schemaField] = row[fileCol] ?? "";
				}
			}
			return doc;
		});

		const total = allDocuments.length;
		const chunks: Record<string, string>[][] = [];
		for (let i = 0; i < total; i += CHUNK_SIZE) {
			chunks.push(allDocuments.slice(i, i + CHUNK_SIZE));
		}

		abortRef.current = false;
		importedIdsRef.current = [];
		setProgress({ current: 0, total: chunks.length, status: "importing" });

		try {
			let importedCount = 0;
			for (let i = 0; i < chunks.length; i++) {
				if (abortRef.current) break;

				const result = await importChunkMutation.mutateAsync({
					organizationId,
					slug,
					documents: chunks[i],
				});

				// Track created document IDs for undo
				if (Array.isArray(result)) {
					for (const doc of result) {
						if (doc?.id) {
							importedIdsRef.current.push(doc.id);
						}
					}
				}

				importedCount += chunks[i].length;
				setProgress({ current: i + 1, total: chunks.length, status: "importing" });
			}

			if (!abortRef.current) {
				setImportedCount(importedCount);
				setProgress({ current: chunks.length, total: chunks.length, status: "done" });
				void queryClient.invalidateQueries({
					queryKey: orpc.collections.documents.list.key(),
				});
			}
		} catch (err) {
			setProgress((p) => ({ ...p, status: "error" }));
			toastError(
				t("search.import.error") ||
					`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [parsedData, columnMapping, organizationId, slug, t, queryClient]);

	const handleCancel = useCallback(() => {
		abortRef.current = true;
		setProgress({ current: 0, total: 0, status: "idle" });
	}, []);

	const handleUndo = useCallback(() => {
		const ids = importedIdsRef.current;
		if (ids.length === 0) {
			handleClose();
			return;
		}
		deleteBatchMutation.mutate({
			organizationId,
			slug,
			ids,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [organizationId, slug, deleteBatchMutation]);

	const handleClose = () => {
		abortRef.current = true;
		importedIdsRef.current = [];
		setImportedCount(0);
		setParsedData(null);
		setColumnMapping({});
		setActiveTab(TAB_FILE);
		setProgress({ current: 0, total: 0, status: "idle" });
		onOpenChange(false);
	};

	const schemaFieldsForMapping =
		schemaFieldNames.length > 0 ? schemaFieldNames : parsedData ? parsedData.columns : [];

	const isImporting = progress.status === "importing";
	const isDone = progress.status === "done";

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent className="sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle className="gap-2 inline-flex items-center">
						<UploadIcon className="size-5" />
						{t("search.import.title") || "Import Documents"}
					</DialogTitle>
					<DialogDescription>
						{isDone
							? t("search.import.importComplete") ||
								`${importedCount} documents imported successfully`
							: t("search.import.description") ||
								"Import documents from CSV, TSV, JSON, or paste from Excel/Sheets"}
					</DialogDescription>
				</DialogHeader>

				{isDone ? (
					/* ── Done state with undo ───────────────────────────────────── */
					<div className="space-y-4">
						<div className="gap-3 p-4 flex items-center rounded-lg border bg-primary/5">
							<div className="size-3 rounded-full bg-primary" />
							<div className="flex-1">
								<p className="font-medium text-sm">
									{t("search.import.importComplete") || "Import complete"}
								</p>
								<p className="text-xs text-muted-foreground">
									{t("search.import.importedCount", { count: importedCount }) ??
										`${importedCount} documents imported`}
								</p>
							</div>
						</div>

						<div className="gap-2 flex justify-end">
							<Button
								variant="outline"
								onClick={handleUndo}
								disabled={deleteBatchMutation.isPending}
							>
								<RotateCcwIcon className="size-4" />
								{deleteBatchMutation.isPending
									? t("search.import.undoing") || "Undoing..."
									: t("search.import.undo") || "Undo Import"}
							</Button>
							<Button variant="primary" onClick={handleClose}>
								{t("common.done") || "Done"}
							</Button>
						</div>
					</div>
				) : parsedData ? (
					<div className="space-y-4">
						<ImportPreview
							data={parsedData}
							columnMapping={columnMapping}
							onColumnMappingChange={setColumnMapping}
							schemaFields={schemaFieldsForMapping}
							onImport={handleImport}
							isImporting={isImporting}
							fileType={fileType === "paste" ? undefined : fileType}
						/>

						{/* Progress bar for chunked import */}
						{isImporting && (
							<div className="space-y-2">
								<div className="gap-2 inline-flex items-center text-xs text-muted-foreground">
									<span>
										{t("search.import.importingBatch") ||
											`Importing batch ${progress.current} of ${progress.total}...`}
									</span>
									<button
										type="button"
										onClick={handleCancel}
										className="underline hover:text-foreground"
									>
										{t("search.import.cancel") || "Cancel"}
									</button>
								</div>
								<Progress
									value={(progress.current / progress.total) * 100}
									className="h-2"
								/>
							</div>
						)}
					</div>
				) : (
					<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
						<TabsList className="w-full">
							<TabsTrigger value={TAB_FILE} className="flex-1">
								<UploadIcon className="size-4" />
								{t("search.import.uploadFile") || "Upload File"}
							</TabsTrigger>
							<TabsTrigger value={TAB_PASTE} className="flex-1">
								{t("search.import.pasteTab") || "Paste"}
							</TabsTrigger>
						</TabsList>
						<TabsContent value={TAB_FILE}>
							<ImportFileUpload
								onParse={(data, type) => handleParse(data, type)}
								disabled={isImporting}
							/>
						</TabsContent>
						<TabsContent value={TAB_PASTE}>
							<ImportPaste
								onParse={(data) => handleParse(data, "paste")}
								disabled={isImporting}
							/>
						</TabsContent>
					</Tabs>
				)}
			</DialogContent>
		</Dialog>
	);
}
