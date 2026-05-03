"use client";

import { Card, CardContent, cn } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import {
	type ColumnDef,
	type SortingState,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";

export interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	pageSize?: number;
	emptyMessage?: string;
	className?: string;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	pageSize = 10,
	emptyMessage = "No results.",
	className,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: { sorting },
		initialState: { pagination: { pageSize, pageIndex: 0 } },
	});

	const rows = table.getRowModel().rows;

	return (
		<div className={cn("space-y-4", className)}>
			<Card className="rounded-md border"><CardContent className="p-0">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder ? null : header.column.getCanSort() ? (
											<button
												type="button"
												className="-ml-1 gap-1 rounded px-1 py-0.5 text-xs font-medium inline-flex items-center text-left transition-colors hover:bg-muted/50"
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(header.column.columnDef.header, header.getContext())}
												{{
													asc: <ChevronUpIcon className="size-3" />,
													desc: <ChevronDownIcon className="size-3" />,
												}[header.column.getIsSorted() as string] ?? null}
											</button>
										) : (
											flexRender(header.column.columnDef.header, header.getContext())
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{rows.length > 0 ? (
							rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center text-muted-foreground"
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</CardContent></Card>

			{table.getPageCount() > 1 && (
				<div className="flex items-center justify-between">
					<span className="text-sm text-muted-foreground">
						Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
					</span>
					<div className="gap-1 flex items-center">
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronLeftIcon className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<ChevronRightIcon className="size-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
