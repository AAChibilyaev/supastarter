"use client";

import { DataTableProvider, DataTableToolbar, type DataTableFilterField } from "@repo/ui";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
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
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { FileIcon, FileTextIcon, ImageIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { formatFileSize } from "../../lib/format";
import { MySearchDeleteFileDialog } from "./MySearchDeleteFileDialog";
import { MySearchFilePreview } from "./MySearchFilePreview";
import { inferFileType } from "./types";
import type { MySearchFileEntry, MySearchFileType } from "./types";

// ─── Props ──────────────────────────────────────────────────────────────────

interface MySearchFileTableProps {
	organizationId: string;
	indexId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFileIcon(type: MySearchFileType) {
	switch (type) {
		case "image":
			return ImageIcon;
		case "url":
			return FileIcon;
		default:
			return FileTextIcon;
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

export function MySearchFileTable({ organizationId, indexId }: MySearchFileTableProps) {
	const t = useTranslations("mySearch");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [previewFile, setPreviewFile] = useState<MySearchFileEntry | null>(null);
	const [deleteFile, setDeleteFile] = useState<MySearchFileEntry | null>(null);

	// ── Fetch files ─────────────────────────────────────────────────────────

	const { data: files, isLoading } = useQuery(
		orpc.mySearch.listFiles.queryOptions({
			input: { organizationId, indexId },
			enabled: !!organizationId && !!indexId,
		}),
	);

	// ── Columns ─────────────────────────────────────────────────────────────

	const columns: ColumnDef<MySearchFileEntry>[] = useMemo(
		() => [
			{
				id: "name",
				accessorFn: (row) => row.originalFilename,
				header: t("files.name"),
				size: 300,
				cell: ({ row }) => {
					const fileType = inferFileType(row.original);
					const Icon = getFileIcon(fileType);
					return (
						<button
							type="button"
							className="gap-2 flex items-center transition-colors hover:text-primary"
							onClick={() => setPreviewFile(row.original)}
						>
							<Icon className="size-4 shrink-0 text-muted-foreground" />
							<span className="font-medium text-sm truncate">
								{truncate(row.original.originalFilename, 50)}
							</span>
						</button>
					);
				},
			},
			{
				id: "type",
				accessorFn: (row) => row.fileType,
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
				accessorFn: (row) => row.fileSize,
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
					const val = getValue() as number;
					return val > 0 ? (
						<span className="font-mono text-xs text-muted-foreground">
							{val.toLocaleString()}
						</span>
					) : (
						<span className="text-muted-foreground/40">&mdash;</span>
					);
				},
			},
			{
				id: "uploadedAt",
				accessorFn: (row) => row.uploadedAt,
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

	// ── Table ───────────────────────────────────────────────────────────────

	const filterFields: DataTableFilterField<MySearchFileEntry>[] = [];

	const table = useReactTable({
		data: files ?? [],
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="space-y-4">
			<DataTableProvider
				table={table}
				columns={columns}
				filterFields={filterFields}
				totalRows={files?.length ?? 0}
			>
				<DataTableToolbar />
				{/* Table */}
				<Card className="overflow-x-auto rounded-lg border">
					<CardContent className="p-0">
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
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
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
								) : !files || files.length === 0 ? (
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
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											))}
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</DataTableProvider>

			{/* Preview dialog */}
			{previewFile && (
				<MySearchFilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
			)}

			{/* Delete dialog */}
			{deleteFile && (
				<MySearchDeleteFileDialog
					file={deleteFile}
					organizationId={organizationId}
					indexId={indexId}
					onClose={() => setDeleteFile(null)}
				/>
			)}
		</div>
	);
}
