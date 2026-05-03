"use client";

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
import { UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { ImportFileType } from "./ImportFileUpload";
import { ImportFileUpload } from "./ImportFileUpload";
import { ImportPaste } from "./ImportPaste";
import { ImportPreview, type ParsedImportData } from "./ImportPreview";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	slug: string;
	/** Schema field names available for mapping */
	schemaFields: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

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

	// ── Import mutation ──────────────────────────────────────────────────────

	const importMutation = useMutation(
		orpc.collections.documents.createBatch.mutationOptions({
			onSuccess: () => {
				toastSuccess(
					t("search.import.success", {
						count: parsedData?.totalRows ?? 0,
					}) || `Imported ${parsedData?.totalRows ?? 0} documents`,
				);
				void queryClient.invalidateQueries({
					queryKey: orpc.collections.documents.list.key(),
				});
				handleClose();
			},
			onError: (err) => {
				toastError(t("search.import.error") || `Import failed: ${err.message}`);
			},
		}),
	);

	const handleImport = () => {
		if (!parsedData) return;

		// Build documents from mapped columns
		const documents = parsedData.rows.map((row) => {
			const doc: Record<string, string> = {};
			for (const [fileCol, schemaField] of Object.entries(columnMapping)) {
				if (schemaField) {
					doc[schemaField] = row[fileCol] ?? "";
				}
			}
			return doc;
		});

		importMutation.mutate({
			organizationId,
			slug,
			documents,
		});
	};

	const handleClose = () => {
		setParsedData(null);
		setColumnMapping({});
		setActiveTab(TAB_FILE);
		onOpenChange(false);
	};

	const schemaFieldsForMapping =
		schemaFieldNames.length > 0
			? schemaFieldNames
			: parsedData
				? parsedData.columns
				: [];

	const isImporting = importMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent className="sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle className="gap-2 inline-flex items-center">
						<UploadIcon className="size-5" />
						{t("search.import.title") || "Import Documents"}
					</DialogTitle>
					<DialogDescription>
						{t("search.import.description") ||
							"Import documents from CSV, TSV, JSON, or paste from Excel/Sheets"}
					</DialogDescription>
				</DialogHeader>

				{parsedData ? (
					<ImportPreview
						data={parsedData}
						columnMapping={columnMapping}
						onColumnMappingChange={setColumnMapping}
						schemaFields={schemaFieldsForMapping}
						onImport={handleImport}
						isImporting={isImporting}
						fileType={fileType === "paste" ? undefined : fileType}
					/>
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
