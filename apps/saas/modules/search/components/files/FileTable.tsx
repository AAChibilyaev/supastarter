"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	type VisibilityState,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ChevronDownIcon,
	ColumnsIcon,
	FileIcon,
	FileTextIcon,
	ImageIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { DeleteFileDialog } from "./DeleteFileDialog";
import { FilePreview } from "./FilePreview";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FileEntry {
	id: string;
	name: string;
	type: "pdf" | "docx" | "txt" | "csv" | "json" | "md" | "html" | "url" | "image" | "other";
	mimeType: string;
	sizeBytes: number;
	wordCount?: number;
	pageCount?: number;
	status: "indexed" | "processing" | "failed";
	createdAt: string;
	updatedAt: string;
}

interface FileTableProps {
	organizationId: string;
	slug: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / Math.pow(1024, i);
	return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getFileIcon(type: FileEntry["type"]) {
	switch (type) {
		case "image":
			return ImageIcon;
		case "url":
			return FileIcon;
		case "pdf":
		case "docx":
		case "txt":
		case "csv":
		case "json":
		case "md":
		default:
			return FileTextIcon;
	}
}

function getFileStatusColor(status: FileEntry["status"]): "success" | "warning" | "error" {
	switch (status) {
		case "indexed":
			return "success";
		case "processing":
			return "warning";
		case "failed":
			return "error";
	}
}

function truncate(str: string, max = 40): string {
	if (str.length <= max) return str;
	return `${str.slice(0, max)}\u2026`;
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonRows({ columns }: { columns: number }) {
	return (
		<>
			{Array.from({ length: 5 }).map((_, rowIdx) => (
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

// ─── Main Component ─────────────────────────────────────────────────────────

export function FileTable({ organizationId, slug }: FileTableProps) {
	const t = useTranslations("search");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
	const [deleteFile, setDeleteFile] = useState<FileEntry | null>(null);

	// ── Fetch files (using existing documents API) ─────────────────────────

	const { data: docsData, isLoading } = useQuery(
		orpc.search.listDocuments.queryOptions({
			input: {
				organizationId,
				slug,
				page: 1,
				perPage: 100,
			},
			enabled: !!organizationId && !!slug,
		}),
	);

	// ── Transform documents to file entries ────────────────────────────────

	const files: FileEntry[] = useMemo(() => {
		if (!docsData?.hits) return [];
		return (docsData.hits as Array<{ document: Record<string, unknown> }>).map(
			(hit, idx): FileEntry => {
				const doc = hit.document ?? {};
				return {
					id: (doc.id as string) ?? `file-${idx}`,
					name: (doc.title as string) ?? (doc.name as string) ?? `document-${idx}`,
					type: inferFileType(doc),
					mimeType:
						(doc.mime_type as string) ?? (doc.content_type as string) ?? "application/octet-stream",
					sizeBytes: (doc.size as number) ?? (doc.file_size as number) ?? 0,
					wordCount: doc.word_count as number | undefined,
					pageCount: doc.page_count as number | undefined,
					status: "indexed",
					createdAt: (doc.created_at as string) ?? new Date().toISOString(),
					updatedAt: (doc.updated_at as string) ?? new Date().toISOString(),
				};
			},
		);
	}, [docsData]);

	function inferFileType(doc: Record<string, unknown>): FileEntry["type"] {
		const mime = (doc.mime_type as string) ?? "";
		const ext = ((doc.file_extension as string) ?? (doc.name as string) ?? "").toLowerCase();
		if (ext.includes(".pdf") || mime.includes("pdf")) return "pdf";
		if (ext.includes(".docx") || mime.includes("word")) return "docx";
		if (ext.includes(".csv") || mime.includes("csv")) return "csv";
		if (ext.includes(".json")) return "json";
		if (ext.includes(".md")) return "md";
		if (mime.includes("image") || ext.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return "image";
		if (mime.includes("html") || ext.includes(".html") || ext.includes(".htm")) return "html";
		if ((doc.url as string) || ext.startsWith("http")) return "url";
		return "txt";
	}

	// ── Columns ────────────────────────────────────────────────────────────

	const columns: ColumnDef<FileEntry>[] = useMemo(
		() => [
			{
				id: "name",
				accessorFn: (row) => row.name,
				header: t("files.name"),
				size: 300,
				cell: ({ row }) => {
					const Icon = getFileIcon(row.original.type);
					return (
						<button
							type="button"
							className="gap-2 flex items-center transition-colors hover:text-primary"
							onClick={() => setPreviewFile(row.original)}
						>
							<Icon className="size-4 shrink-0 text-muted-foreground" />
							<span className="font-medium text-sm truncate">
								{truncate(row.original.name, 50)}
							</span>
						</button>
					);
				},
			},
			{
				id: "type",
				accessorFn: (row) => row.type,
				header: t("files.type"),
				size: 80,
				cell: ({ getValue }) => (
					<Badge status="info" className="text-xs uppercase">
						{getValue() as string}
					</Badge>
				),
			},
			{
				id: "size",
				accessorFn: (row) => row.sizeBytes,
				header: t("files.size"),
				size: 100,
				cell: ({ getValue }) => (
					<span className="font-mono text-xs text-muted-foreground">
						{formatFileSize(getValue() as number)}
					</span>
				),
			},
			{
				id: "words",
				accessorFn: (row) => row.wordCount,
				header: t("files.words"),
				size: 80,
				cell: ({ getValue }) => {
					const val = getValue() as number | undefined;
					return val != null ? (
						<span className="font-mono text-xs text-muted-foreground">{val.toLocaleString()}</span>
					) : (
						<span className="text-muted-foreground/40">&mdash;</span>
					);
				},
			},
			{
				id: "status",
				accessorFn: (row) => row.status,
				header: t("files.status"),
				size: 100,
				cell: ({ getValue }) => {
					const status = getValue() as FileEntry["status"];
					return <Badge status={getFileStatusColor(status)}>{status}</Badge>;
				},
			},
			{
				id: "createdAt",
				accessorFn: (row) => row.createdAt,
				header: t("files.uploaded"),
				size: 140,
				cell: ({ getValue }) => (
					<span className="text-xs text-muted-foreground">
						{new Date(getValue() as string).toLocaleDateString()}
					</span>
				),
			},
			{
				id: "actions",
				header: "",
				size: 60,
				enableSorting: false,
				cell: ({ row }) => (
					<div className="flex justify-end">
						<Button
							variant="ghost"
							size="sm"
							className="size-8 p-0 text-muted-foreground hover:text-destructive"
							onClick={(e) => {
								e.stopPropagation();
								setDeleteFile(row.original);
							}}
						>
							<Trash2Icon className="size-4" />
							<span className="sr-only">{t("files.delete")}</span>
						</Button>
					</div>
				),
			},
		],
		[t],
	);

	// ── Table ──────────────────────────────────────────────────────────────

	const table = useReactTable({
		data: files,
		columns,
		state: { sorting, columnVisibility },
		onSortingChange: setSorting,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="space-y-4">
			{/* Header toolbar */}
			<div className="gap-2 flex items-center justify-between">
				<p className="text-sm text-muted-foreground">{t("files.count", { count: files.length })}</p>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<ColumnsIcon className="size-3.5" />
							{t("documents.columns")}
							<ChevronDownIcon className="size-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>{t("documents.toggleColumns")}</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{table
							.getAllLeafColumns()
							.filter((col) => col.id !== "actions")
							.map((column) => (
								<DropdownMenuCheckboxItem
									key={column.id}
									checked={column.getIsVisible()}
									onCheckedChange={(value) => column.toggleVisibility(!!value)}
								>
									{column.id}
								</DropdownMenuCheckboxItem>
							))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Table */}
			<div className="overflow-x-auto rounded-lg border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										style={{ width: header.getSize() }}
										onClick={header.column.getToggleSortingHandler()}
										className={
											header.column.getCanSort()
												? "cursor-pointer select-none hover:text-foreground"
												: ""
										}
									>
										{flexRender(header.column.columnDef.header, header.getContext())}
										{{
											asc: " \u2191",
											desc: " \u2193",
										}[header.column.getIsSorted() as string] ?? null}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<SkeletonRows columns={columns.length} />
						) : files.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="py-12 text-center text-muted-foreground"
								>
									{t("files.empty")}
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className="cursor-pointer"
									onClick={() => setPreviewFile(row.original)}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Preview dialog */}
			{previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}

			{/* Delete dialog */}
			{deleteFile && (
				<DeleteFileDialog
					file={deleteFile}
					organizationId={organizationId}
					slug={slug}
					onClose={() => setDeleteFile(null)}
				/>
			)}
		</div>
	);
}
