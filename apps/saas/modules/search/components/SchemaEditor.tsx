"use client";

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Textarea } from "@repo/ui/components/textarea";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Check,
	Copy,
	Eye,
	FileJson,
	GripVertical,
	Plus,
	Save,
	Settings2,
	Trash2,
	X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────

type FieldType =
	| "string"
	| "int32"
	| "int64"
	| "float"
	| "bool"
	| "string[]"
	| "int32[]"
	| "int64[]"
	| "float[]"
	| "bool[]"
	| "object"
	| "object[]"
	| "auto";

const FIELD_TYPES: FieldType[] = [
	"string",
	"int32",
	"int64",
	"float",
	"bool",
	"string[]",
	"int32[]",
	"int64[]",
	"float[]",
	"bool[]",
	"object",
	"object[]",
	"auto",
];

interface SchemaField {
	name: string;
	type: FieldType;
	index?: boolean;
	facet?: boolean;
	sort?: boolean;
	optional?: boolean;
	/** settings sheet extras (not persisted to Typesense directly) */
	default?: string;
	locale?: string;
	validators?: string;
}

interface DiffEntry {
	type: "added" | "removed" | "changed";
	fieldName: string;
	detail: string;
}

// ── Sortable Field Row ────────────────────────────────────────────

interface SortableFieldRowProps {
	field: SchemaField;
	index: number;
	onChange: (index: number, patch: Partial<SchemaField>) => void;
	onDelete: (index: number) => void;
	onStartRename: (index: number) => void;
	onFinishRename: (index: number, name: string) => void;
	onCancelRename: () => void;
	editingIndex: number | null;
	editingValue: string;
	setEditingValue: (v: string) => void;
	onOpenSettings: (index: number) => void;
}

function SortableFieldRow({
	field,
	index,
	onChange,
	onDelete,
	onStartRename,
	onFinishRename,
	onCancelRename,
	editingIndex,
	editingValue,
	setEditingValue,
	onOpenSettings,
}: SortableFieldRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: field.name || `field-${index}`,
	});
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};
	const t = useTranslations();

	const badgeVariants = ["search", "facet", "filter", "optional"] as const;
	const badgeFieldMap: Record<(typeof badgeVariants)[number], keyof SchemaField> = {
		search: "index",
		facet: "facet",
		filter: "sort",
		optional: "optional",
	};

	const handleToggle = (badge: (typeof badgeVariants)[number]) => {
		const fieldKey = badgeFieldMap[badge];
		onChange(index, { [fieldKey]: !field[fieldKey] });
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`gap-2 px-3 py-2.5 flex items-center rounded-lg border bg-card ${
				isDragging ? "shadow-md z-10" : ""
			}`}
		>
			{/* Drag handle */}
			<button
				type="button"
				className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
				{...attributes}
				{...listeners}
				tabIndex={-1}
			>
				<GripVertical className="size-4" />
			</button>

			{/* Field name (inline editable) */}
			<div className="min-w-0 w-36 shrink-0">
				{editingIndex === index ? (
					<Input
						value={editingValue}
						onChange={(e) => setEditingValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								onFinishRename(index, editingValue);
							} else if (e.key === "Escape") {
								onCancelRename();
							}
						}}
						onBlur={() => onFinishRename(index, editingValue)}
						className="h-8 text-xs font-mono"
						autoFocus
					/>
				) : (
					<button
						type="button"
						className="font-mono text-xs w-full truncate text-left transition-colors hover:text-primary"
						onClick={() => onStartRename(index)}
						title={t("search.schemaEditor.clickToEdit")}
					>
						{field.name || (
							<span className="text-muted-foreground italic">
								{t("search.schemaEditor.unnamed")}
							</span>
						)}
					</button>
				)}
			</div>

			{/* Type picker */}
			<Select
				value={field.type}
				onValueChange={(val) => onChange(index, { type: val as FieldType })}
			>
				<SelectTrigger className="w-28 h-8 text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{FIELD_TYPES.map((ft) => (
						<SelectItem key={ft} value={ft} className="text-xs font-mono">
							{ft}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Toggle badges */}
			<div className="gap-1 flex shrink-0 items-center">
				{badgeVariants.map((badge) => {
					const isActive = !!field[badgeFieldMap[badge]];
					return (
						<button
							key={badge}
							type="button"
							onClick={() => handleToggle(badge)}
							className={`text-xs px-2 py-0.5 font-medium rounded-full transition-colors ${
								isActive
									? "bg-primary/10 text-primary hover:bg-primary/20"
									: "bg-muted text-muted-foreground hover:bg-muted/80"
							}`}
						>
							{badge}
						</button>
					);
				})}
			</div>

			{/* Settings button */}
			<button
				type="button"
				onClick={() => onOpenSettings(index)}
				className="shrink-0 text-muted-foreground hover:text-foreground"
				title={t("search.schemaEditor.settings")}
			>
				<Settings2 className="size-4" />
			</button>

			{/* Delete button */}
			<button
				type="button"
				onClick={() => onDelete(index)}
				className="shrink-0 text-muted-foreground hover:text-destructive"
				title={t("search.schemaEditor.delete")}
			>
				<Trash2 className="size-4" />
			</button>
		</div>
	);
}

// ── Diff formatting helper ───────────────────────────────────────

function computeDiff(draft: SchemaField[], saved: SchemaField[]): DiffEntry[] {
	const diffs: DiffEntry[] = [];
	const draftMap = new Map(draft.map((f) => [f.name, f]));
	const savedMap = new Map(saved.map((f) => [f.name, f]));

	// Added fields
	for (const field of draft) {
		if (!savedMap.has(field.name)) {
			const tags: string[] = [field.type];
			if (field.facet) tags.push("facet");
			if (field.sort) tags.push("filter");
			if (field.index) tags.push("search");
			if (field.optional) tags.push("optional");
			diffs.push({
				type: "added",
				fieldName: field.name,
				detail: `+ field '${field.name}' added (${tags.join(", ")})`,
			});
		}
	}

	// Removed fields
	for (const field of saved) {
		if (!draftMap.has(field.name)) {
			diffs.push({
				type: "removed",
				fieldName: field.name,
				detail: `- field '${field.name}' removed`,
			});
		}
	}

	// Changed fields
	for (const field of draft) {
		const savedField = savedMap.get(field.name);
		if (!savedField) continue;

		const changes: string[] = [];
		const toggleKeys: Array<{ key: keyof SchemaField; label: string }> = [
			{ key: "index", label: "search" },
			{ key: "facet", label: "facet" },
			{ key: "sort", label: "filter" },
			{ key: "optional", label: "optional" },
		];

		if (field.type !== savedField.type) {
			changes.push(`type: ${savedField.type}→${field.type}`);
		}

		for (const tk of toggleKeys) {
			const oldVal = !!savedField[tk.key];
			const newVal = !!field[tk.key];
			if (oldVal !== newVal) {
				const oldTags = toggleKeys
					.filter((t) => !!savedField[t.key])
					.map((t) => t.label)
					.join("+");
				const newTags = toggleKeys
					.filter((t) => !!field[t.key])
					.map((t) => t.label)
					.join("+");
				changes.push(`${oldTags || "(none)"}→${newTags || "(none)"}`);
			}
		}

		if (changes.length > 0) {
			diffs.push({
				type: "changed",
				fieldName: field.name,
				detail: `~ field '${field.name}' changed: ${changes.join(", ")}`,
			});
		}
	}

	return diffs;
}

// ── Main Component ────────────────────────────────────────────────

interface SchemaEditorProps {
	organizationId: string;
	slug: string;
}

export function SchemaEditor({ organizationId, slug }: SchemaEditorProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	// ── State ────────────────────────────────────────────────────

	const [fields, setFields] = useState<SchemaField[]>([]);
	const [defaultSortingField, setDefaultSortingField] = useState<string>("");
	const [initialized, setInitialized] = useState(false);
	const savedFieldsRef = useRef<SchemaField[]>([]);
	const savedDefaultSortRef = useRef<string>("");

	// Editing state
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [editingValue, setEditingValue] = useState("");

	// Dialog/Sheet state
	const [importOpen, setImportOpen] = useState(false);
	const [importJson, setImportJson] = useState("");
	const [importError, setImportError] = useState("");
	const [diffOpen, setDiffOpen] = useState(false);
	const [settingsIndex, setSettingsIndex] = useState<number | null>(null);

	// ── Query ────────────────────────────────────────────────────

	const { data, isLoading, isError, refetch } = useQuery(
		orpc.search.schema.get.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);

	// Sync local state when data loads
	useEffect(() => {
		if (data && !initialized) {
			const mapped: SchemaField[] = (data.fields ?? []).map((f) => ({
				name: f.name,
				type: f.type as FieldType,
				index: f.index ?? true, // default to true as per Typesense convention
				facet: f.facet ?? false,
				sort: f.sort ?? false,
				optional: f.optional ?? false,
			}));
			setFields(mapped);
			setDefaultSortingField(data.defaultSortingField ?? "");
			savedFieldsRef.current = JSON.parse(JSON.stringify(mapped));
			savedDefaultSortRef.current = data.defaultSortingField ?? "";
			setInitialized(true);
		}
	}, [data, initialized]);

	// ── Mutation ────────────────────────────────────────────────

	const updateMutation = useMutation({
		...orpc.search.schema.update.mutationOptions(),
		onSuccess: () => {
			toastSuccess(t("search.schemaEditor.saved"));
			savedFieldsRef.current = JSON.parse(JSON.stringify(fields));
			savedDefaultSortRef.current = defaultSortingField;
			void queryClient.invalidateQueries({
				queryKey: orpc.search.schema.get.queryKey({
					input: { organizationId, slug },
				}),
			});
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("search.schemaEditor.saveError"));
		},
	});

	// ── Handlers ────────────────────────────────────────────────

	const handleAddField = useCallback(() => {
		const newName = `field_${fields.length + 1}`;
		setFields([...fields, { name: newName, type: "string" }]);
	}, [fields]);

	const handleDeleteField = useCallback((index: number) => {
		setFields((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const handleFieldChange = useCallback((index: number, patch: Partial<SchemaField>) => {
		setFields((prev) => {
			const updated = [...prev];
			updated[index] = { ...updated[index], ...patch };
			return updated;
		});
	}, []);

	const handleStartRename = useCallback(
		(index: number) => {
			setEditingIndex(index);
			setEditingValue(fields[index]?.name ?? "");
		},
		[fields],
	);

	const handleFinishRename = useCallback(
		(index: number, name: string) => {
			setEditingIndex(null);
			if (name.trim()) {
				handleFieldChange(index, { name: name.trim() });
			}
		},
		[handleFieldChange],
	);

	const handleCancelRename = useCallback(() => {
		setEditingIndex(null);
		setEditingValue("");
	}, []);

	const handleCancel = useCallback(() => {
		setFields(JSON.parse(JSON.stringify(savedFieldsRef.current)));
		setDefaultSortingField(savedDefaultSortRef.current);
	}, []);

	const handleSave = useCallback(
		(triggerReindex: boolean) => {
			const fieldsPayload = fields.map(
				({ default: _d, locale: _l, validators: _v, ...rest }) => ({
					...rest,
					index: rest.index ?? true,
					facet: rest.facet ?? false,
					sort: rest.sort ?? false,
					optional: rest.optional ?? false,
				}),
			);
			updateMutation.mutate({
				organizationId,
				slug,
				fields: fieldsPayload,
				defaultSortingField: defaultSortingField || undefined,
				triggerReindex,
			});
		},
		[fields, defaultSortingField, organizationId, slug, updateMutation],
	);

	// Import JSON
	const handleImport = useCallback(() => {
		try {
			const parsed = JSON.parse(importJson);
			if (!Array.isArray(parsed)) {
				setImportError(t("search.schemaEditor.importMustBeArray"));
				return;
			}
			const validated: SchemaField[] = parsed.map((item: Record<string, unknown>) => ({
				name: String(item.name ?? ""),
				type: (FIELD_TYPES.includes(item.type as FieldType)
					? item.type
					: "string") as FieldType,
				index: item.index !== false, // default true
				facet: item.facet === true,
				sort: item.sort === true,
				optional: item.optional === true,
			}));
			setFields(validated);
			setImportOpen(false);
			setImportJson("");
			setImportError("");
		} catch {
			setImportError(t("search.schemaEditor.invalidJson"));
		}
	}, [importJson, t]);

	// Export JSON
	const handleExport = useCallback(async () => {
		const exportData = fields.map(
			({ default: _d, locale: _l, validators: _v, ...rest }) => rest,
		);
		try {
			await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
			toastSuccess(t("search.schemaEditor.exported"));
		} catch {
			toastError(t("search.schemaEditor.exportError"));
		}
	}, [fields, t]);

	// Compute diff for preview
	const diffEntries = useMemo(() => computeDiff(fields, savedFieldsRef.current), [fields]);

	const hasChanges =
		JSON.stringify(fields) !== JSON.stringify(savedFieldsRef.current) ||
		defaultSortingField !== savedDefaultSortRef.current;

	// DnD sensors
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 4,
			},
		}),
	);

	const handleDragEnd = useCallback((event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		setFields((prev) => {
			const oldIndex = prev.findIndex(
				(f) => f.name === active.id || `field-${prev.indexOf(f)}` === active.id,
			);
			const newIndex = prev.findIndex(
				(f) => f.name === over.id || `field-${prev.indexOf(f)}` === over.id,
			);
			if (oldIndex === -1 || newIndex === -1) return prev;
			const updated = [...prev];
			const [moved] = updated.splice(oldIndex, 1);
			updated.splice(newIndex, 0, moved);
			return updated;
		});
	}, []);

	const sortableIds = useMemo(() => fields.map((f, i) => f.name || `field-${i}`), [fields]);

	// ── Early return: loading ────────────────────────────────────

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6 space-y-3">
					<div className="gap-2 flex">
						<Skeleton className="h-9 w-24 rounded-full" />
						<Skeleton className="h-9 w-28 rounded-full" />
						<Skeleton className="h-9 w-28 rounded-full" />
						<Skeleton className="h-9 w-28 rounded-full" />
					</div>
					<Skeleton className="h-12 w-full rounded-lg" />
					<Skeleton className="h-12 w-full rounded-lg" />
					<Skeleton className="h-12 w-full rounded-lg" />
				</CardContent>
			</Card>
		);
	}

	// ── Early return: error ──────────────────────────────────────

	if (isError) {
		return (
			<Card>
				<CardContent className="py-12 flex flex-col items-center justify-center">
					<p className="text-sm font-medium mb-2 text-destructive">
						{t("search.schemaEditor.loadError")}
					</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						{t("search.schemaEditor.retry")}
					</Button>
				</CardContent>
			</Card>
		);
	}

	// ── Render ──────────────────────────────────────────────────

	return (
		<Card>
			<CardContent className="p-6 space-y-4">
				{/* ── Toolbar ────────────────────────────────────────── */}
				<div className="gap-2 flex flex-wrap items-center">
					<Button variant="secondary" size="sm" onClick={handleAddField}>
						<Plus className="size-3.5" />
						{t("search.schemaEditor.addField")}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setImportOpen(true);
							setImportError("");
							setImportJson("");
						}}
					>
						<FileJson className="size-3.5" />
						{t("search.schemaEditor.importJson")}
					</Button>
					<Button variant="outline" size="sm" onClick={handleExport}>
						<Copy className="size-3.5" />
						{t("search.schemaEditor.exportJson")}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setDiffOpen(true)}
						disabled={!hasChanges}
					>
						<Eye className="size-3.5" />
						{t("search.schemaEditor.previewDiff")}
					</Button>
				</div>

				{/* ── Field list or empty state ─────────────────────── */}
				{fields.length === 0 ? (
					<div className="py-12 flex flex-col items-center justify-center text-center">
						<p className="text-sm mb-3 text-muted-foreground">
							{t("search.schemaEditor.empty")}
						</p>
						<Button variant="secondary" size="sm" onClick={handleAddField}>
							<Plus className="size-3.5" />
							{t("search.schemaEditor.addFirstField")}
						</Button>
					</div>
				) : (
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
							<div className="space-y-2">
								{fields.map((field, index) => (
									<SortableFieldRow
										key={field.name || `field-${index}`}
										field={field}
										index={index}
										onChange={handleFieldChange}
										onDelete={handleDeleteField}
										onStartRename={handleStartRename}
										onFinishRename={handleFinishRename}
										onCancelRename={handleCancelRename}
										editingIndex={editingIndex}
										editingValue={editingValue}
										setEditingValue={setEditingValue}
										onOpenSettings={(i) => setSettingsIndex(i)}
									/>
								))}
							</div>
						</SortableContext>
					</DndContext>
				)}

				{/* ── Bottom controls ──────────────────────────────── */}
				<div className="gap-3 pt-4 sm:justify-between flex flex-wrap items-center border-t">
					<div className="gap-2 flex items-center">
						<Label className="text-xs shrink-0 text-muted-foreground">
							{t("search.schemaEditor.defaultSort")}
						</Label>
						<Select value={defaultSortingField} onValueChange={setDefaultSortingField}>
							<SelectTrigger className="w-44 h-8 text-xs">
								<SelectValue placeholder={t("search.schemaEditor.noDefaultSort")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="" className="text-xs text-muted-foreground">
									{t("search.schemaEditor.noDefaultSort")}
								</SelectItem>
								{fields.map((f) => (
									<SelectItem
										key={f.name}
										value={f.name}
										className="text-xs font-mono"
									>
										{f.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="gap-2 flex items-center">
						<Button
							variant="outline"
							size="sm"
							onClick={handleCancel}
							disabled={!hasChanges || updateMutation.isPending}
						>
							<X className="size-3.5" />
							{t("search.schemaEditor.cancel")}
						</Button>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => handleSave(false)}
							disabled={!hasChanges || updateMutation.isPending}
							loading={updateMutation.isPending}
						>
							<Save className="size-3.5" />
							{t("search.schemaEditor.saveOnly")}
						</Button>
						<Button
							variant="primary"
							size="sm"
							onClick={() => handleSave(true)}
							disabled={!hasChanges || updateMutation.isPending}
							loading={updateMutation.isPending}
						>
							<Save className="size-3.5" />
							<Check className="size-3.5" />
							{t("search.schemaEditor.saveReindex")}
						</Button>
					</div>
				</div>

				{/* ── Import JSON Dialog ───────────────────────────── */}
				<Dialog open={importOpen} onOpenChange={setImportOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t("search.schemaEditor.importDialogTitle")}</DialogTitle>
							<DialogDescription>
								{t("search.schemaEditor.importDialogDesc")}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-3">
							<Textarea
								value={importJson}
								onChange={(e) => {
									setImportJson(e.target.value);
									setImportError("");
								}}
								placeholder='[{"name":"title","type":"string","facet":true}]'
								className="min-h-32 font-mono text-xs"
							/>
							{importError && (
								<p className="text-xs text-destructive">{importError}</p>
							)}
							<div className="gap-2 flex justify-end">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setImportOpen(false)}
								>
									{t("search.schemaEditor.cancel")}
								</Button>
								<Button variant="primary" size="sm" onClick={handleImport}>
									{t("search.schemaEditor.importAction")}
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>

				{/* ── Diff Preview Dialog ──────────────────────────── */}
				<Dialog open={diffOpen} onOpenChange={setDiffOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t("search.schemaEditor.diffTitle")}</DialogTitle>
							<DialogDescription>
								{t("search.schemaEditor.diffDesc")}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-2 max-h-64 overflow-y-auto">
							{diffEntries.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									{t("search.schemaEditor.noChanges")}
								</p>
							) : (
								diffEntries.map((entry, i) => {
									const colorClass =
										entry.type === "added"
											? "text-success"
											: entry.type === "removed"
												? "text-destructive"
												: "text-foreground/60";
									const prefix =
										entry.type === "added"
											? "+"
											: entry.type === "removed"
												? "-"
												: "~";
									return (
										<div
											key={i}
											className={`font-mono text-xs ${colorClass} px-2 py-1 rounded bg-muted/50`}
										>
											{prefix} {entry.detail.slice(2)}
										</div>
									);
								})
							)}
						</div>
					</DialogContent>
				</Dialog>

				{/* ── Settings Sheet ───────────────────────────────── */}
				<Sheet
					open={settingsIndex !== null}
					onOpenChange={(open) => {
						if (!open) setSettingsIndex(null);
					}}
				>
					<SheetContent side="right">
						<SheetHeader>
							<SheetTitle>
								{settingsIndex !== null
									? t("search.schemaEditor.settingsTitle", {
											name: fields[settingsIndex]?.name ?? "",
										})
									: t("search.schemaEditor.settings")}
							</SheetTitle>
							<SheetDescription>
								{t("search.schemaEditor.settingsDesc")}
							</SheetDescription>
						</SheetHeader>
						{settingsIndex !== null && fields[settingsIndex] && (
							<div className="mt-6 space-y-4">
								<div className="space-y-1.5">
									<Label className="text-xs text-muted-foreground">
										{t("search.schemaEditor.defaultValue")}
									</Label>
									<Input
										value={fields[settingsIndex].default ?? ""}
										onChange={(e) =>
											handleFieldChange(settingsIndex, {
												default: e.target.value,
											})
										}
										placeholder={t(
											"search.schemaEditor.defaultValuePlaceholder",
										)}
										className="h-8 text-xs"
									/>
								</div>
								<div className="space-y-1.5">
									<Label className="text-xs text-muted-foreground">
										{t("search.schemaEditor.locale")}
									</Label>
									<Input
										value={fields[settingsIndex].locale ?? ""}
										onChange={(e) =>
											handleFieldChange(settingsIndex, {
												locale: e.target.value,
											})
										}
										placeholder="e.g. en, de, fr"
										className="h-8 text-xs"
									/>
								</div>
								<div className="space-y-1.5">
									<Label className="text-xs text-muted-foreground">
										{t("search.schemaEditor.validators")}
									</Label>
									<Textarea
										value={fields[settingsIndex].validators ?? ""}
										onChange={(e) =>
											handleFieldChange(settingsIndex, {
												validators: e.target.value,
											})
										}
										placeholder='{"required":true,"max_length":255}'
										className="min-h-20 font-mono text-xs"
									/>
								</div>
							</div>
						)}
					</SheetContent>
				</Sheet>
			</CardContent>
		</Card>
	);
}
