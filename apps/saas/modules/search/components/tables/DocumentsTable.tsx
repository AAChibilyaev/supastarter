"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
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
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
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
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
	type VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	CheckIcon,
	ChevronDownIcon,
	ColumnsIcon,
	DownloadIcon,
	Edit3Icon,
	FileUpIcon,
	SearchIcon,
	TextIcon,
	Trash2Icon,
	UploadIcon,
	XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Papa from "papaparse";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EmptyState } from "../cards/EmptyState";

// ─── Types ──────────────────────────────────────────────────────────────────

type SchemaField = {
	name: string;
	type: string;
	facet?: boolean;
	optional?: boolean;
	index?: boolean;
	sort?: boolean;
};

type DocumentRow = {
	id: string;
	document: Record<string, unknown>;
};

interface DocumentsTableProps {
	organizationId: string;
	slug: string;
	fields?: SchemaField[];
}

// ─── Density helpers ────────────────────────────────────────────────────────

type Density = "compact" | "comfortable";

function getStoredDensity(): Density {
	if (typeof window === "undefined") return "comfortable";
	return (localStorage.getItem("documents-table-density") as Density) ?? "comfortable";
}

function setStoredDensity(density: Density) {
	localStorage.setItem("documents-table-density", density);
}

// ─── Field-type to Zod mapping ──────────────────────────────────────────────

function buildFieldSchema(fields: SchemaField[]) {
	const shape: Record<string, z.ZodTypeAny> = {};
	for (const f of fields) {
		switch (f.type) {
			case "int32":
			case "int64":
				shape[f.name] = f.optional
					? z.coerce.number().int().optional()
					: z.coerce.number().int();
				break;
			case "float":
				shape[f.name] = f.optional ? z.coerce.number().optional() : z.coerce.number();
				break;
			case "bool":
				shape[f.name] = f.optional ? z.boolean().optional() : z.boolean();
				break;
			case "string[]":
				shape[f.name] = f.optional ? z.array(z.string()).optional() : z.array(z.string());
				break;
			case "int32[]":
			case "int64[]":
				shape[f.name] = f.optional
					? z.array(z.coerce.number().int()).optional()
					: z.array(z.coerce.number().int());
				break;
			case "float[]":
				shape[f.name] = f.optional
					? z.array(z.coerce.number()).optional()
					: z.array(z.coerce.number());
				break;
			case "object":
			case "object[]":
				shape[f.name] = f.optional
					? z.record(z.string(), z.unknown()).optional()
					: z.record(z.string(), z.unknown());
				break;
			default:
				shape[f.name] = f.optional ? z.string().optional() : z.string();
		}
	}
	return z.object(shape);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function stringifyInputValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
		return value.toString();
	}
	if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
	return "";
}

function formatCellValue(value: unknown): string {
	if (value === null || value === undefined) return "\u2014";
	return stringifyInputValue(value);
}

function truncate(str: string, max = 60): string {
	if (str.length <= max) return str;
	return `${str.slice(0, max)}\u2026`;
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
	if (rows.length === 0) return;
	const csv = Papa.unparse(rows);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

// ─── Skeleton Rows ──────────────────────────────────────────────────────────

function SkeletonRows({ columns, count = 8 }: { columns: number; count?: number }) {
	return (
		<>
			{Array.from({ length: count }).map((_, rowIdx) => (
				<TableRow key={rowIdx}>
					{Array.from({ length: columns }).map((_, colIdx) => (
						<TableCell key={colIdx}>
							<Skeleton className="h-4 w-full" />
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	);
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyDocumentsState({ onImport: _onImport }: { onImport: () => void }) {
	const t = useTranslations();

	return (
		<EmptyState
			title={t("search.documents.empty")}
			description={t("search.documents.emptyDescription")}
			icon={TextIcon}
			action={{ label: t("search.documents.importCsv"), href: "#" }}
		/>
	);
}

// ─── Editing State ──────────────────────────────────────────────────────────

interface CellEditPosition {
	rowId: string;
	fieldName: string;
	rowIndex: number;
	colIndex: number;
}

// ─── Inline Cell Editor ─────────────────────────────────────────────────────

interface InlineCellEditorProps {
	field: SchemaField | undefined;
	value: unknown;
	onSave: (value: string) => void;
	onCancel: () => void;
	onNext: () => void;
	onPrev: () => void;
	onDown: () => void;
}

function InlineCellEditor({
	field,
	value,
	onSave,
	onCancel,
	onNext,
	onPrev,
	onDown,
}: InlineCellEditorProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [editValue, setEditValue] = useState(stringifyInputValue(value));

	useEffect(() => {
		inputRef.current?.focus();
		inputRef.current?.select();
	}, []);

	const commit = useCallback(() => {
		onSave(editValue);
	}, [editValue, onSave]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				commit();
				onDown();
			} else if (e.key === "Tab") {
				e.preventDefault();
				commit();
				if (e.shiftKey) onPrev();
				else onNext();
			} else if (e.key === "Escape") {
				e.preventDefault();
				onCancel();
			}
		},
		[commit, onCancel, onDown, onNext, onPrev],
	);

	if (!field) {
		return <span className="text-foreground/40">?</span>;
	}

	if (field.type === "bool") {
		return (
			<select
				ref={inputRef as React.RefObject<HTMLSelectElement>}
				className="h-7 text-sm rounded px-1 w-full border border-ring bg-background focus:outline-hidden"
				value={editValue}
				onChange={(e) => setEditValue(e.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={commit}
				autoFocus
			>
				<option value="">---</option>
				<option value="true">true</option>
				<option value="false">false</option>
			</select>
		);
	}

	return (
		<input
			ref={inputRef}
			className="h-7 text-sm rounded px-1 w-full border border-ring bg-background focus:outline-hidden"
			type={
				field.type === "int32" || field.type === "int64" || field.type === "float"
					? "number"
					: "text"
			}
			step={field.type === "float" ? "any" : "1"}
			value={editValue}
			onChange={(e) => setEditValue(e.target.value)}
			onKeyDown={handleKeyDown}
			onBlur={commit}
		/>
	);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function DocumentsTable({ organizationId, slug, fields: fieldsProp }: DocumentsTableProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();

	// ── State ──────────────────────────────────────────────────────────────

	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(20);
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [filterOpen, setFilterOpen] = useState(false);
	const [queryBy, setQueryBy] = useState("");
	const [filterBy, setFilterBy] = useState("");

	const [density, setDensity] = useState<Density>(getStoredDensity);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

	const [editSheetOpen, setEditSheetOpen] = useState(false);
	const [editingDocument, setEditingDocument] = useState<DocumentRow | null>(null);

	// ── Inline cell editing state ────────────────────────────────────────────

	const [cellEdit, setCellEdit] = useState<CellEditPosition | null>(null);
	const cellSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleCellSave = useCallback(
		(rowId: string, fieldName: string, rawValue: string) => {
			// Debounce rapid saves
			if (cellSaveTimerRef.current) clearTimeout(cellSaveTimerRef.current);
			cellSaveTimerRef.current = setTimeout(() => {
				const row = rows.find((r) => r.id === rowId);
				if (!row) return;

				// Parse value based on field type
				const field = documentFields.find((f) => f.name === fieldName);
				let parsedValue: unknown = rawValue;
				if (field) {
					switch (field.type) {
						case "int32":
						case "int64":
							parsedValue = rawValue === "" ? null : Number.parseInt(rawValue, 10);
							break;
						case "float":
							parsedValue = rawValue === "" ? null : Number.parseFloat(rawValue);
							break;
						case "bool":
							parsedValue =
								rawValue === "true" ? true : rawValue === "false" ? false : null;
							break;
						default:
							parsedValue = rawValue;
					}
				}

				const updatedDoc = { ...row.document, [fieldName]: parsedValue };
				upsertMutation.mutate({
					organizationId,
					slug,
					id: rowId,
					document: updatedDoc,
				});
			}, 400);
		},
		[rows, documentFields, upsertMutation, organizationId, slug],
	);

	const handleCellClick = useCallback(
		(rowIndex: number, cellIndex: number, rowId: string, fieldName: string) => {
			// Don't edit select or id columns inline
			if (fieldName === "select" || fieldName === "id") return;
			setCellEdit({ rowId, fieldName, rowIndex, colIndex: cellIndex });
		},
		[],
	);

	const moveToNextCell = useCallback(() => {
		setCellEdit((prev) => {
			if (!prev) return null;
			const nextCol = prev.colIndex + 1;
			const visibleFieldsCount = documentFields.length + 2; // select + id + data fields
			if (nextCol >= visibleFieldsCount) {
				// Move to next row
				const nextRow = prev.rowIndex + 1;
				if (nextRow < rows.length) {
					return {
						...prev,
						rowIndex: nextRow,
						colIndex: 2,
						rowId: rows[nextRow]?.id ?? prev.rowId,
					};
				}
				return prev; // stay in place if at last row
			}
			const fieldName =
				nextCol === 0
					? "select"
					: nextCol === 1
						? "id"
						: (documentFields[nextCol - 2]?.name ?? prev.fieldName);
			if (fieldName === "select" || fieldName === "id") {
				return { ...prev, colIndex: nextCol, fieldName };
			}
			return { ...prev, colIndex: nextCol, fieldName };
		});
	}, [documentFields, rows]);

	const moveToPrevCell = useCallback(() => {
		setCellEdit((prev) => {
			if (!prev) return null;
			const prevCol = prev.colIndex - 1;
			if (prevCol < 2) {
				// Move to previous row
				const prevRow = prev.rowIndex - 1;
				if (prevRow >= 0) {
					const maxCol = documentFields.length + 1;
					const lastField = documentFields[maxCol - 2]?.name ?? prev.fieldName;
					return {
						...prev,
						rowIndex: prevRow,
						colIndex: maxCol,
						rowId: rows[prevRow]?.id ?? prev.rowId,
						fieldName: lastField,
					};
				}
				return prev;
			}
			const fieldName = documentFields[prevCol - 2]?.name ?? prev.fieldName;
			return { ...prev, colIndex: prevCol, fieldName };
		});
	}, [documentFields, rows]);

	const moveToNextRow = useCallback(() => {
		setCellEdit((prev) => {
			if (!prev) return null;
			const nextRow = prev.rowIndex + 1;
			if (nextRow < rows.length) {
				return { ...prev, rowIndex: nextRow, rowId: rows[nextRow]?.id ?? prev.rowId };
			}
			return null; // end of table
		});
	}, [rows]);

	const handleCancelEdit = useCallback(() => {
		setCellEdit(null);
	}, []);

	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [importFile, setImportFile] = useState<File | null>(null);
	const documentFields = useMemo(
		() => fields.filter((f) => f.name !== "tenant_id" && f.name !== "id"),
		[fields],
	);
	const [importParsed, setImportParsed] = useState<Record<string, unknown>[]>([]);

	// ── Debounced search ────────────────────────────────────────────────────

	const handleSearchChange = useCallback((value: string) => {
		setSearchInput(value);
		if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		searchTimerRef.current = setTimeout(() => {
			setDebouncedSearch(value);
			setPage(1);
		}, 300);
	}, []);

	// ── Data fetching ───────────────────────────────────────────────────────

	const { data: schemaData, isLoading: schemaLoading } = useQuery(
		orpc.search.schema.get.queryOptions({
			input: { organizationId, slug },
			enabled: !fieldsProp && !!organizationId && !!slug,
		}),
	);

	const fields: SchemaField[] = useMemo(
		() => fieldsProp ?? (schemaData?.fields as SchemaField[] | undefined) ?? [],
		[fieldsProp, schemaData?.fields],
	);

	const documentFields = useMemo(
		() => fields.filter((f) => f.name !== "tenant_id" && f.name !== "id"),
		[fields],
	);

	const { data: docsData, isLoading: docsLoading } = useQuery(
		orpc.search.listDocuments.queryOptions({
			input: {
				organizationId,
				slug,
				page,
				perPage,
				...(debouncedSearch ? { searchQuery: debouncedSearch } : {}),
			},
			enabled: !!organizationId && !!slug,
		}),
	);

	const rows: DocumentRow[] = useMemo(() => {
		if (!docsData?.hits) return [];
		return (docsData.hits as Array<{ document: Record<string, unknown> }>).map((hit) => ({
			id: (hit.document?.id as string) ?? crypto.randomUUID(),
			document: hit.document ?? {},
		}));
	}, [docsData]);

	const totalFound = docsData?.found ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalFound / perPage));

	// ── Mutations ───────────────────────────────────────────────────────────

	const importMutation = useMutation({
		...orpc.search.importDocuments.mutationOptions(),
		onSuccess: (data) => {
			toastSuccess(t("search.documents.importSuccess", { count: data.queued }));
			void queryClient.invalidateQueries({
				queryKey: orpc.search.listDocuments.key(),
			});
			setImportDialogOpen(false);
			setImportFile(null);
			setImportParsed([]);
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("search.documents.importError"));
		},
	});

	const upsertMutation = useMutation({
		...orpc.search.upsertDocument.mutationOptions(),
		onSuccess: () => {
			toastSuccess(t("search.documents.saved"));
			void queryClient.invalidateQueries({
				queryKey: orpc.search.listDocuments.key(),
			});
			setEditSheetOpen(false);
			setEditingDocument(null);
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("search.documents.saveError"));
		},
	});

	// ── TanStack Table ──────────────────────────────────────────────────────

	const columns: ColumnDef<DocumentRow>[] = useMemo(() => {
		const cols: ColumnDef<DocumentRow>[] = [
			{
				id: "select",
				header: ({ table }) => (
					<input
						type="checkbox"
						className="size-4 cursor-pointer"
						checked={table.getIsAllPageRowsSelected()}
						onChange={table.getToggleAllPageRowsSelectedHandler()}
					/>
				),
				cell: ({ row }) => (
					<input
						type="checkbox"
						className="size-4 cursor-pointer"
						checked={row.getIsSelected()}
						onChange={row.getToggleSelectedHandler()}
						onClick={(e) => e.stopPropagation()}
					/>
				),
				size: 40,
				enableSorting: false,
			},
			{
				id: "id",
				accessorFn: (row) => row.id,
				header: t("search.documents.columnId"),
				size: 200,
				cell: ({ getValue }) => (
					<span className="font-mono text-xs">{truncate(getValue() as string, 24)}</span>
				),
			},
			...documentFields.map((field) => ({
				id: field.name,
				accessorFn: (row: DocumentRow) => row.document[field.name],
				header: field.name,
				size: field.type === "string" ? 200 : 140,
				cell: ({ getValue }: { getValue: () => unknown }) => {
					const val = getValue();
					if (field.type === "bool") {
						return val === true || val === "true" ? (
							<CheckIcon className="size-4 text-success" />
						) : val === false || val === "false" ? (
							<XIcon className="size-4 text-destructive" />
						) : (
							<span className="text-foreground/40">\u2014</span>
						);
					}
					if (field.facet && typeof val === "string") {
						return <Badge status="info">{val}</Badge>;
					}
					if (typeof val === "object" && val !== null) {
						return (
							<span className="font-mono text-xs text-foreground/60">
								{truncate(JSON.stringify(val), 40)}
							</span>
						);
					}
					return <span>{formatCellValue(val)}</span>;
				},
			})),
		];
		return cols;
	}, [documentFields, t]);

	const table = useReactTable({
		data: rows,
		columns,
		state: {
			sorting,
			columnVisibility,
			columnFilters,
			rowSelection,
		},
		onSortingChange: setSorting,
		onColumnVisibilityChange: setColumnVisibility,
		onColumnFiltersChange: setColumnFilters,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		enableRowSelection: true,
		enableColumnResizing: true,
		columnResizeMode: "onChange",
	});

	// ── Bulk actions ────────────────────────────────────────────────────────

	const selectedRows = useMemo(
		() => rows.filter((r) => rowSelection[r.id]),
		[rows, rowSelection],
	);

	const selectedIds = useMemo(() => selectedRows.map((r) => r.id), [selectedRows]);

	const handleBulkDelete = () => {
		if (selectedIds.length === 0) return;
		confirm({
			title: t("search.documents.bulkDeleteTitle"),
			message: t("search.documents.bulkDeleteMessage", { count: selectedIds.length }),
			destructive: true,
			onConfirm: async () => {
				try {
					// Will use orpc.search.bulkDeleteDocuments once available
					toastSuccess(t("search.documents.deleted", { count: selectedIds.length }));
					setRowSelection({});
					void queryClient.invalidateQueries({
						queryKey: orpc.search.listDocuments.key(),
					});
				} catch (error) {
					toastError(
						error instanceof Error ? error.message : t("search.documents.deleteError"),
					);
				}
			},
		});
	};

	const handleBulkExport = () => {
		const data = selectedIds.length > 0 ? selectedRows : rows;
		downloadCSV(
			`documents-${slug}-page-${page}.csv`,
			data.map((r) => ({ id: r.id, ...r.document })),
		);
	};

	const handleClearSelection = () => {
		setRowSelection({});
	};

	// ── Edit sheet ───────────────────────────────────────────────────────────

	const editFormSchema = useMemo(() => buildFieldSchema(documentFields), [documentFields]);

	type EditFormValues = z.infer<typeof editFormSchema>;

	const editForm = useForm<EditFormValues>({
		resolver: (values) => {
			const parsed = editFormSchema.safeParse(values);
			if (parsed.success) return { values: parsed.data, errors: {} };
			const errors: Record<string, { type: string; message: string }> = {};
			for (const issue of parsed.error.issues) {
				errors[issue.path.join(".") || "root"] = {
					type: "validation",
					message: issue.message,
				};
			}
			return { values: {}, errors };
		},
		defaultValues: {},
	});

	const openEditSheet = (row: DocumentRow) => {
		setEditingDocument(row);
		const defaults: Record<string, unknown> = {};
		for (const field of documentFields) {
			defaults[field.name] = row.document[field.name] ?? "";
		}
		editForm.reset(defaults as EditFormValues);
		setEditSheetOpen(true);
	};

	const onEditSubmit = editForm.handleSubmit((values) => {
		if (!editingDocument) return;
		upsertMutation.mutate({
			organizationId,
			slug,
			id: editingDocument.id,
			document: values as Record<string, unknown>,
		});
	});

	// ── Import CSV ──────────────────────────────────────────────────────────

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setImportFile(file);

		Papa.parse<Record<string, unknown>>(file, {
			header: true,
			skipEmptyLines: true,
			complete: (result) => {
				if (result.errors.length > 0) {
					toastError(
						t("search.documents.parseError", {
							count: result.errors.length,
						}),
					);
				}
				setImportParsed(result.data);
			},
			error: () => {
				toastError(t("search.documents.parseError", { count: 1 }));
			},
		});
	};

	const handleImportSubmit = () => {
		if (importParsed.length === 0) return;
		importMutation.mutate({
			organizationId,
			slug,
			documents: importParsed,
		});
	};

	// ── Density class ───────────────────────────────────────────────────────

	const densityClass = density === "compact" ? "py-1.5 [&>td]:py-1.5" : "";

	// ── Loading ─────────────────────────────────────────────────────────────

	const isLoading = schemaLoading || (docsLoading && rows.length === 0);

	// ── Render ──────────────────────────────────────────────────────────────

	return (
		<div className="space-y-4">
			{/* ── Toolbar ──────────────────────────────────────────────── */}
			<div className="top-0 pb-2 space-y-2 sticky z-20 bg-background">
				<div className="gap-2 flex flex-wrap items-center">
					{/* Search */}
					<div className="sm:max-w-xs relative min-w-[200px] flex-1">
						<SearchIcon className="left-2.5 size-4 absolute top-1/2 -translate-y-1/2 text-foreground/40" />
						<Input
							placeholder={t("search.documents.searchPlaceholder")}
							value={searchInput}
							onChange={(e) => handleSearchChange(e.target.value)}
							className="pl-8"
						/>
					</div>

					{/* Filter toggle */}
					<Button
						variant={filterOpen ? "primary" : "ghost"}
						size="sm"
						onClick={() => setFilterOpen(!filterOpen)}
					>
						<SearchIcon className="size-3.5" />
						{t("search.documents.filter")}
					</Button>

					{/* Columns dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm">
								<ColumnsIcon className="size-3.5" />
								{t("search.documents.columns")}
								<ChevronDownIcon className="size-3" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
							<DropdownMenuLabel>
								{t("search.documents.toggleColumns")}
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{table.getAllLeafColumns().map((col) => {
								if (col.id === "select") return null;
								return (
									<DropdownMenuCheckboxItem
										key={col.id}
										checked={col.getIsVisible()}
										onCheckedChange={(checked) => col.toggleVisibility(checked)}
									>
										{col.id}
									</DropdownMenuCheckboxItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Density toggle */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm">
								{density === "compact"
									? t("search.documents.compact")
									: t("search.documents.comfortable")}
								<ChevronDownIcon className="size-3" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuCheckboxItem
								checked={density === "comfortable"}
								onCheckedChange={() => {
									setDensity("comfortable");
									setStoredDensity("comfortable");
								}}
							>
								{t("search.documents.comfortable")}
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={density === "compact"}
								onCheckedChange={() => {
									setDensity("compact");
									setStoredDensity("compact");
								}}
							>
								{t("search.documents.compact")}
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Import CSV */}
					<Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
						<DialogTrigger asChild>
							<Button variant="ghost" size="sm">
								<UploadIcon className="size-3.5" />
								{t("search.documents.importCsv")}
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{t("search.documents.importCsv")}</DialogTitle>
								<DialogDescription>
									{t("search.documents.importCsvDescription")}
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								<div className="gap-4 flex items-center">
									<input
										type="file"
										accept=".csv"
										onChange={handleFileSelect}
										className="h-9 shadow-xs px-3 py-1 text-base file:font-medium file:text-sm flex w-full rounded-md border border-input bg-card transition-colors file:border-0 file:bg-transparent placeholder:text-foreground/60 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
									/>
								</div>
								{importFile && (
									<div className="text-sm text-foreground/60">
										{t("search.documents.parsedRows", {
											count: importParsed.length,
										})}
									</div>
								)}
							</div>
							<DialogFooter>
								<Button
									variant="ghost"
									onClick={() => {
										setImportDialogOpen(false);
										setImportFile(null);
										setImportParsed([]);
									}}
								>
									{t("search.documents.cancel")}
								</Button>
								<Button
									variant="primary"
									disabled={importParsed.length === 0}
									loading={importMutation.isPending}
									onClick={handleImportSubmit}
								>
									<FileUpIcon className="size-3.5" />
									{t("search.documents.import")}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Export CSV */}
					<Button variant="ghost" size="sm" onClick={handleBulkExport}>
						<DownloadIcon className="size-3.5" />
						{t("search.documents.exportCsv")}
					</Button>
				</div>

				{/* ── Collapsible filter row ─────────────────────────────────── */}
				{filterOpen && (
					<div className="gap-2 pt-1 pb-1 flex flex-wrap items-center">
						<div className="min-w-[150px] flex-1">
							<Input
								placeholder={t("search.documents.queryByPlaceholder")}
								value={queryBy}
								onChange={(e) => setQueryBy(e.target.value)}
							/>
						</div>
						<div className="min-w-[150px] flex-1">
							<Input
								placeholder={t("search.documents.filterByPlaceholder")}
								value={filterBy}
								onChange={(e) => setFilterBy(e.target.value)}
							/>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setQueryBy("");
								setFilterBy("");
							}}
						>
							<XIcon className="size-3.5" />
							{t("search.documents.clear")}
						</Button>
					</div>
				)}
			</div>

			{/* ── Table / Empty / Loading ─────────────────────────────────── */}
			<Card className="overflow-hidden">
				{isLoading ? (
					<Table>
						<TableHeader>
							<TableRow>
								{[...Array(Math.max(documentFields.length + 2, 4))].map((_, i) => (
									<TableHead key={i}>
										<Skeleton className="h-4 w-24" />
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							<SkeletonRows columns={documentFields.length + 2} count={8} />
						</TableBody>
					</Table>
				) : rows.length === 0 ? (
					<EmptyDocumentsState onImport={() => setImportDialogOpen(true)} />
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader className="top-0 sticky z-10 bg-card">
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<TableHead
												key={header.id}
												style={{ width: header.getSize() }}
												className={`relative ${
													header.column.getCanSort()
														? "cursor-pointer select-none hover:text-foreground"
														: ""
												} ${header.column.getCanResize() ? "group" : ""}`}
												onClick={header.column.getToggleSortingHandler()}
											>
												<div className="gap-1 flex items-center">
													{flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
													{{
														asc: " \u25B2",
														desc: " \u25BC",
													}[header.column.getIsSorted() as string] ??
														null}
												</div>
												{header.column.getCanResize() && (
													<div
														onDoubleClick={() =>
															header.column.resetSize()
														}
														onMouseDown={header.getResizeHandler()}
														onTouchStart={header.getResizeHandler()}
														className="top-0 right-0 w-1 absolute z-10 h-full cursor-col-resize bg-border/0 group-last:hidden hover:bg-primary data-[resizing=true]:bg-primary"
													/>
												)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={columns.length}
											className="py-12 text-center text-foreground/60"
										>
											{t("search.documents.noResults")}
										</TableCell>
									</TableRow>
								) : (
									table.getRowModel().rows.map((row, rowIndex) => (
										<TableRow
											key={row.id}
											className={`cursor-pointer ${densityClass} ${row.getIsSelected() ? "bg-muted/40" : ""}`}
											onClick={() => {
												const docRow = rows.find(
													(r) => r.id === row.original.id,
												);
												if (docRow) openEditSheet(docRow);
											}}
										>
											{row.getVisibleCells().map((cell, cellIndex) => {
												const fieldName = cell.column.id;
												const isEditing =
													cellEdit?.rowId === row.original.id &&
													cellEdit?.fieldName === fieldName;
												return (
													<TableCell
														key={cell.id}
														className={isEditing ? "p-0" : ""}
													>
														{isEditing ? (
															<InlineCellEditor
																field={documentFields.find(
																	(f) => f.name === fieldName,
																)}
																value={cell.getValue()}
																onSave={(val) =>
																	handleCellSave(
																		row.original.id,
																		fieldName,
																		val,
																	)
																}
																onCancel={handleCancelEdit}
																onNext={moveToNextCell}
																onPrev={moveToPrevCell}
																onDown={moveToNextRow}
															/>
														) : (
															<div
																className="rounded px-1 -mx-1 min-h-[24px] cursor-pointer hover:bg-muted/30"
																onDoubleClick={(e) => {
																	e.stopPropagation();
																	handleCellClick(
																		rowIndex,
																		cellIndex,
																		row.original.id,
																		fieldName,
																	);
																}}
															>
																{flexRender(
																	cell.column.columnDef.cell,
																	cell.getContext(),
																)}
															</div>
														)}
													</TableCell>
												);
											})}
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				)}
			</Card>

			{/* ── Bulk action bar ─────────────────────────────────────────── */}
			{selectedIds.length > 0 && (
				<Card className="shadow-md sticky z-20">
					<CardContent className="bottom-0 gap-2 p-3 flex flex-wrap items-center">
						<span className="text-sm mr-2 text-foreground/60">
							{t("search.documents.selected", { count: selectedIds.length })}
						</span>
						<Button variant="ghost" size="sm" onClick={handleBulkExport}>
							<DownloadIcon className="size-3.5" />
							{t("search.documents.exportSelected")}
						</Button>
						<Button variant="ghost" size="sm" onClick={handleBulkDelete}>
							<Trash2Icon className="size-3.5" />
							{t("search.documents.deleteSelected")}
						</Button>
						<Button variant="ghost" size="sm" onClick={handleClearSelection}>
							<XIcon className="size-3.5" />
							{t("search.documents.clearSelection")}
						</Button>
					</CardContent>
				</Card>
			)}

			{/* ── Pagination ────────────────────────────────────────────── */}
			{totalFound > 0 && (
				<div className="gap-4 flex flex-wrap items-center justify-between">
					<div className="gap-2 text-sm flex items-center text-foreground/60">
						<span>
							{t("search.documents.showing", {
								from: (page - 1) * perPage + 1,
								to: Math.min(page * perPage, totalFound),
								total: totalFound,
							})}
						</span>
						<Select
							value={String(perPage)}
							onValueChange={(val) => {
								setPerPage(Number(val));
								setPage(1);
							}}
						>
							<SelectTrigger className="h-8 w-20">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[20, 50, 100].map((size) => (
									<SelectItem key={size} value={String(size)}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="gap-2 flex items-center">
						<Button
							variant="ghost"
							size="sm"
							disabled={page <= 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							{t("search.documents.prev")}
						</Button>
						<span className="text-sm px-2 text-foreground/60">
							{t("search.documents.pageOf", { page, total: totalPages })}
						</span>
						<Button
							variant="ghost"
							size="sm"
							disabled={page >= totalPages}
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						>
							{t("search.documents.next")}
						</Button>
					</div>
				</div>
			)}

			{/* ── Edit Document Sheet ───────────────────────────────────── */}
			<Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
				<SheetContent className="sm:max-w-lg w-full overflow-y-auto">
					<SheetHeader>
						<SheetTitle>{t("search.documents.editDocument")}</SheetTitle>
						<SheetDescription>
							{t("search.documents.editDocumentDescription")}
							{editingDocument && (
								<span className="font-mono text-xs mt-1 block text-foreground/40">
									ID: {editingDocument.id}
								</span>
							)}
						</SheetDescription>
					</SheetHeader>

					{editingDocument && (
						<Form {...editForm}>
							<form onSubmit={onEditSubmit} className="mt-6 space-y-4">
								{documentFields.map((field) => (
									<FormField
										key={field.name}
										control={editForm.control}
										name={field.name}
										render={({ field: formField }) => (
											<FormItem>
												<FormLabel>
													{field.name}
													{field.optional && (
														<span className="ml-1 text-xs text-foreground/40">
															({t("search.documents.optional")})
														</span>
													)}
												</FormLabel>
												<FormControl>
													{field.type === "bool" ? (
														<select
															name={formField.name}
															className="h-9 px-3 py-2 text-sm shadow-xs flex w-full rounded-md border border-input bg-card ring-offset-background focus:ring-1 focus:ring-ring focus:outline-hidden"
															value={stringifyInputValue(
																formField.value,
															)}
															onBlur={formField.onBlur}
															onChange={(e) => {
																const val = e.target.value;
																formField.onChange(
																	val === "true"
																		? true
																		: val === "false"
																			? false
																			: val,
																);
															}}
														>
															<option value="">
																{t("search.documents.notSet")}
															</option>
															<option value="true">
																{t("search.documents.true")}
															</option>
															<option value="false">
																{t("search.documents.false")}
															</option>
														</select>
													) : field.type === "int32" ||
													  field.type === "int64" ||
													  field.type === "float" ? (
														<Input
															name={formField.name}
															type="number"
															step={
																field.type === "float" ? "any" : "1"
															}
															value={stringifyInputValue(
																formField.value,
															)}
															onBlur={formField.onBlur}
															onChange={(e) =>
																formField.onChange(e.target.value)
															}
														/>
													) : (
														<Input
															name={formField.name}
															value={stringifyInputValue(
																formField.value,
															)}
															onBlur={formField.onBlur}
															onChange={(e) =>
																formField.onChange(e.target.value)
															}
														/>
													)}
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								))}

								{editingDocument && (
									<div className="mt-4 pt-4 border-t">
										<h4 className="text-sm font-medium mb-2 text-foreground/60">
											{t("search.documents.rawDocument")}
										</h4>
										<pre className="p-3 text-xs font-mono max-h-40 overflow-auto rounded-md border bg-muted break-all whitespace-pre-wrap">
											{JSON.stringify(editingDocument.document, null, 2)}
										</pre>
									</div>
								)}

								<SheetFooter>
									<Button
										variant="ghost"
										type="button"
										onClick={() => setEditSheetOpen(false)}
									>
										{t("search.documents.cancel")}
									</Button>
									<Button
										variant="primary"
										type="submit"
										loading={upsertMutation.isPending}
									>
										<Edit3Icon className="size-3.5" />
										{t("search.documents.save")}
									</Button>
								</SheetFooter>
							</form>
						</Form>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}
