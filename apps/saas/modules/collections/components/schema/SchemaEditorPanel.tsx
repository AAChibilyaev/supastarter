"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Textarea } from "@repo/ui/components/textarea";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	DownloadIcon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
	UploadIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { FieldEditor, FIELD_TYPES, type SchemaField, type SearchMode } from "./FieldEditor";

// ─── Props ──────────────────────────────────────────────────────────────────

interface SchemaEditorPanelProps {
	organizationId: string;
	slug: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SchemaEditorPanel({ organizationId, slug }: SchemaEditorPanelProps) {
	const t = useTranslations("search.collection.schemaEditor");
	const tColl = useTranslations("search.collection");
	const queryClient = useQueryClient();

	const [draft, setDraft] = useState<SchemaField[]>([]);
	const [initialized, setInitialized] = useState(false);
	const [defaultSort, setDefaultSort] = useState<string>("");
	const [tokenSeparatorsInput, setTokenSeparatorsInput] = useState("");
	const [symbolTokensInput, setSymbolTokensInput] = useState("");

	// Field editor dialog
	const [fieldEditorOpen, setFieldEditorOpen] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);

	// Import dialog
	const [importOpen, setImportOpen] = useState(false);
	const [importJson, setImportJson] = useState("");

	// Diff dialog
	const [diffOpen, setDiffOpen] = useState(false);

	// ── Data Fetching ─────────────────────────────────────────────────────────

	const { data: collectionData, isLoading: collectionLoading } = useQuery(
		orpc.collections.get.queryOptions({
			input: { organizationId, slug },
			enabled: Boolean(organizationId) && Boolean(slug),
		}),
	);

	const currentSchema = (collectionData?.schema as SchemaField[] | undefined) ?? [];
	const defaultSortingField = collectionData
		? ((collectionData as any).defaultSortingField as string | null)
		: null;

	// Initialize draft from API response
	if (!initialized && !collectionLoading) {
		const fields: SchemaField[] = currentSchema.map((f: any) => ({
			name: f.name ?? "",
			type: (f.type ?? "string") as SchemaField["type"],
			facet: f.facet ?? false,
			optional: f.optional ?? false,
			index: f.index ?? true,
			sort: f.sort ?? false,
			search: (f.search ?? "infix") as SearchMode,
			defaultValue: f.defaultValue ?? "",
			...(f.embed ? { embed: f.embed } : {}),
		}));
		setDraft(fields);
		setDefaultSort(defaultSortingField ?? "");
		setTokenSeparatorsInput(
			((collectionData as any)?.tokenSeparators as string[] | undefined)?.join(", ") ?? "",
		);
		setSymbolTokensInput(
			((collectionData as any)?.symbolTokensToIndex as string[] | undefined)?.join(", ") ?? "",
		);
		setInitialized(true);
	}

	// ── Mutations ─────────────────────────────────────────────────────────────

	const updateMutation = useMutation(
		orpc.collections.update.mutationOptions({
			onSuccess: () => {
				toastSuccess(t("saved") || "Schema saved");
				void queryClient.invalidateQueries({
					queryKey: orpc.collections.get.queryOptions({ input: { slug, organizationId } }).queryKey,
				});
			},
			onError: () => toastError(t("saveError") || "Failed to save schema"),
		}),
	);

	// ── Derived ───────────────────────────────────────────────────────────────

	const tokenSeparators = tokenSeparatorsInput
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	const symbolTokensToIndex = symbolTokensInput
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);

	const sortableFields = draft.filter(
		(f) => f.name && (f.sort || ["int32", "int64", "float"].includes(f.type)),
	);

	const addedFields = draft.filter((d) => !currentSchema.some((f: any) => f.name === d.name));
	const removedFields = currentSchema.filter((f: any) => !draft.some((d) => d.name === f.name));
	const hasDiff = addedFields.length > 0 || removedFields.length > 0;

	// ── Handlers ──────────────────────────────────────────────────────────────

	const handleAddField = () => {
		const newField: SchemaField = {
			name: "",
			type: "string",
			facet: false,
			optional: false,
			index: true,
			sort: false,
			search: "infix",
			defaultValue: "",
		};
		const newIdx = draft.length;
		setDraft((prev) => [...prev, newField]);
		setEditingIndex(newIdx);
		setFieldEditorOpen(true);
	};

	const handleEditField = (idx: number) => {
		setEditingIndex(idx);
		setFieldEditorOpen(true);
	};

	const handleFieldSave = (field: SchemaField) => {
		setDraft((prev) => prev.map((f, i) => (i === editingIndex ? { ...field } : f)));
	};

	const handleRemoveField = (idx: number) => {
		setDraft((prev) => prev.filter((_, i) => i !== idx));
	};

	const handleSave = (triggerReindex: boolean) => {
		const validFields = draft.filter((f) => f.name.trim());

		// Build the schema update payload
		const schemaPayload = validFields.map((f) => ({
			name: f.name,
			type: f.type,
			facet: f.facet ?? false,
			optional: f.optional ?? false,
			index: f.index ?? true,
			sort: f.sort ?? false,
			search: f.search ?? "infix",
			defaultValue: f.defaultValue ?? undefined,
			...(f.embed ? { embed: f.embed } : {}),
		}));

		updateMutation.mutate({
			organizationId,
			slug,
			schema: schemaPayload as any,
		});
	};

	const handleExportJson = async () => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
			toastSuccess(t("exported") || "Schema JSON copied to clipboard");
		} catch {
			toastError(t("exportError") || "Failed to copy to clipboard");
		}
	};

	const handleImportJson = () => {
		try {
			const parsed = JSON.parse(importJson) as unknown;
			if (!Array.isArray(parsed)) {
				toastError(t("importMustBeArray") || "Import must be an array of fields");
				return;
			}
			setDraft(parsed as SchemaField[]);
			setImportOpen(false);
			setImportJson("");
		} catch {
			toastError(t("invalidJson") || "Invalid JSON");
		}
	};

	// ── Loading State ─────────────────────────────────────────────────────────

	if (collectionLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-4 w-48" />
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
				</CardContent>
			</Card>
		);
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<>
			<Card>
				<CardHeader>
					<div className="gap-2 flex flex-wrap items-start justify-between">
						<div>
							<CardTitle className="text-base">
								{tColl("schemaFields") || "Schema Fields"}
							</CardTitle>
							<CardDescription>
								{slug} &mdash; {draft.length} {tColl("fields") || "fields"}
							</CardDescription>
						</div>
						<div className="gap-2 flex flex-wrap">
							<Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
								<UploadIcon className="size-3.5" />
								{t("importJson") || "Import JSON"}
							</Button>
							<Button variant="outline" size="sm" onClick={handleExportJson}>
								<DownloadIcon className="size-3.5" />
								{t("exportJson") || "Export JSON"}
							</Button>
							{hasDiff && (
								<Button variant="outline" size="sm" onClick={() => setDiffOpen(true)}>
									{t("previewDiff") || "Review changes"}
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Reindex warning */}
					<div className="gap-2 px-3 py-2 text-sm bg-warning/10 text-warning-foreground flex items-start rounded-md">
						<AlertTriangle className="mt-0.5 size-4 text-warning shrink-0" />
						<span>
							{t("reindexWarning") ||
								"Changing schema may require reindexing. Existing documents keep their fields."}
						</span>
					</div>

					{/* Default sort selector */}
					<div className="gap-3 flex flex-wrap items-center">
						<Label className="text-sm shrink-0 text-muted-foreground">
							{t("defaultSort") || "Default sort"}
						</Label>
						<Select value={defaultSort} onValueChange={setDefaultSort}>
							<SelectTrigger className="w-48">
								<SelectValue placeholder={t("noDefaultSort") || "No default sort"} />
							</SelectTrigger>
							<SelectContent>
								{sortableFields.map((f) => (
									<SelectItem key={f.name} value={f.name}>
										{f.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Token Separators */}
					<div className="gap-2 flex flex-col">
						<Label className="text-sm text-muted-foreground">
							{t("tokenSeparators") || "Token separators"}
						</Label>
						<Input
							value={tokenSeparatorsInput}
							onChange={(e) => setTokenSeparatorsInput(e.target.value)}
							className="h-7 font-mono text-xs"
							placeholder="+, #, @"
						/>
					</div>

					{/* Symbol Tokens to Index */}
					<div className="gap-2 flex flex-col">
						<Label className="text-sm text-muted-foreground">
							{t("symbolTokensToIndex") || "Symbol tokens to index"}
						</Label>
						<Input
							value={symbolTokensInput}
							onChange={(e) => setSymbolTokensInput(e.target.value)}
							className="h-7 font-mono text-xs"
							placeholder="#, +"
						/>
					</div>

					{/* Fields Table */}
					{draft.length === 0 ? (
						<div className="py-8 text-center">
							<p className="mb-3 text-sm text-muted-foreground">
								{t("empty") || "No fields defined yet"}
							</p>
							<Button variant="outline" size="sm" onClick={handleAddField}>
								<PlusIcon className="size-3.5" />
								{t("addFirstField") || "Add first field"}
							</Button>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="text-sm w-full">
								<thead>
									<tr className="border-b text-left text-muted-foreground">
										<th className="pb-2 pr-3 font-medium min-w-[140px]">
											{tColl("fieldName") || "Name"}
										</th>
										<th className="pb-2 pr-3 font-medium min-w-[100px]">
											{tColl("fieldType") || "Type"}
										</th>
										<th className="pb-2 pr-2 font-medium text-center">
											{tColl("fieldFacet") || "Facet"}
										</th>
										<th className="pb-2 pr-2 font-medium text-center">
											{tColl("fieldSort") || "Sort"}
										</th>
										<th className="pb-2 pr-2 font-medium text-center">
											{tColl("fieldIndex") || "Index"}
										</th>
										<th className="pb-2 pr-2 font-medium text-center">
											{tColl("fieldOptional") || "Opt."}
										</th>
										<th className="pb-2 pr-2 font-medium text-center">Search</th>
										<th className="pb-2 font-medium" />
									</tr>
								</thead>
								<tbody>
									{draft.map((field, idx) => (
										<tr key={idx} className="group border-b last:border-0">
											<td className="py-1.5 pr-3 font-mono text-xs">{field.name}</td>
											<td className="py-1.5 pr-3">
												<Badge variant="outline" className="font-mono text-[10px]">
													{field.type}
												</Badge>
											</td>
											<td className="py-1.5 pr-2 text-center">
												{field.facet ? (
													<Badge status="success">Yes</Badge>
												) : (
													<span className="text-xs text-muted-foreground">—</span>
												)}
											</td>
											<td className="py-1.5 pr-2 text-center">
												{field.sort ? (
													<Badge status="success">Yes</Badge>
												) : (
													<span className="text-xs text-muted-foreground">—</span>
												)}
											</td>
											<td className="py-1.5 pr-2 text-center">
												{field.index !== false ? (
													<Badge status="info">Yes</Badge>
												) : (
													<span className="text-xs text-muted-foreground">—</span>
												)}
											</td>
											<td className="py-1.5 pr-2 text-center">
												{field.optional ? (
													<span className="text-xs text-muted-foreground">Opt</span>
												) : (
													<Badge variant="outline">Req</Badge>
												)}
											</td>
											<td className="py-1.5 pr-2 text-center">
												<span className="font-mono text-[10px] text-muted-foreground">
													{field.search ?? "infix"}
												</span>
											</td>
											<td className="py-1.5">
												<div className="gap-0.5 flex opacity-0 transition-opacity group-hover:opacity-100">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleEditField(idx)}
														className="size-7 p-0 text-muted-foreground hover:text-foreground"
													>
														<PencilIcon className="size-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleRemoveField(idx)}
														className="size-7 p-0 text-muted-foreground hover:text-destructive"
													>
														<Trash2Icon className="size-3.5" />
													</Button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{/* Footer */}
					<div className="gap-2 pt-2 flex flex-wrap items-center justify-between border-t">
						<Button variant="outline" size="sm" onClick={handleAddField}>
							<PlusIcon className="size-3.5" />
							{t("addField") || "Add field"}
						</Button>
						<div className="gap-2 flex">
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleSave(false)}
								loading={updateMutation.isPending}
							>
								{t("saveOnly") || "Save"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Field Editor Dialog */}
			{editingIndex !== null && draft[editingIndex] && (
				<FieldEditor
					open={fieldEditorOpen}
					onOpenChange={(open) => {
						setFieldEditorOpen(open);
						if (!open) setEditingIndex(null);
					}}
					field={draft[editingIndex]}
					onSave={handleFieldSave}
				/>
			)}

			{/* Import JSON dialog */}
			<Dialog open={importOpen} onOpenChange={setImportOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("importDialogTitle") || "Import Schema JSON"}</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						{t("importDialogDesc") || "Paste JSON array of field definitions"}
					</p>
					<Textarea
						value={importJson}
						onChange={(e) => setImportJson(e.target.value)}
						rows={8}
						className="font-mono text-xs"
						placeholder='[{"name": "title", "type": "string", "facet": false}]'
					/>
					<div className="gap-2 flex justify-end">
						<Button variant="outline" onClick={() => setImportOpen(false)}>
							{t("cancel") || "Cancel"}
						</Button>
						<Button onClick={handleImportJson}>{t("importAction") || "Import"}</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Diff preview dialog */}
			<Dialog open={diffOpen} onOpenChange={setDiffOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("diffTitle") || "Schema Changes"}</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						{t("diffDesc") || "Review fields that will be added or removed"}
					</p>
					{!hasDiff ? (
						<p className="text-sm">{t("noChanges") || "No changes detected"}</p>
					) : (
						<div className="space-y-3 text-sm">
							{addedFields.length > 0 && (
								<div>
									<p className="mb-1 font-medium text-success">
										+ {t("added") || "Added"} ({addedFields.length})
									</p>
									{addedFields.map((f) => (
										<div
											key={f.name}
											className="rounded px-2 py-1 font-mono text-xs bg-success/10 text-success"
										>
											{f.name}: {f.type}
										</div>
									))}
								</div>
							)}
							{removedFields.length > 0 && (
								<div>
									<p className="mb-1 font-medium text-destructive">
										- {t("removed") || "Removed"} ({removedFields.length})
									</p>
									{removedFields.map((f: any) => (
										<div
											key={f.name}
											className="rounded px-2 py-1 font-mono text-xs bg-destructive/10 text-destructive"
										>
											{f.name}: {f.type}
										</div>
									))}
								</div>
							)}
						</div>
					)}
					<div className="gap-2 flex justify-end">
						<Button variant="outline" onClick={() => setDiffOpen(false)}>
							{t("cancel") || "Close"}
						</Button>
						<Button
							onClick={() => {
								handleSave(false);
								setDiffOpen(false);
							}}
							loading={updateMutation.isPending}
						>
							{t("saveOnly") || "Save changes"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
