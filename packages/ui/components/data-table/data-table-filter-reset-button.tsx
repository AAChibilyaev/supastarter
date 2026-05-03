"use client";

import { X } from "lucide-react";

import { cn } from "../../lib";
import { buttonVariants } from "../button";
import { useDataTable } from "./data-table-provider";
import type { DataTableFilterField } from "./types";

export function DataTableFilterResetButton<TData>({ value: _value }: DataTableFilterField<TData>) {
	const { columnFilters, table } = useDataTable();
	const value = _value as string;
	const column = table.getColumn(value);
	const filterValue = columnFilters.find((f) => f.id === value)?.value;

	const filters = filterValue ? (Array.isArray(filterValue) ? filterValue : [filterValue]) : [];

	if (filters.length === 0) return null;

	return (
		<button
			type="button"
			className={cn(
				buttonVariants({ variant: "outline" }),
				"h-5 gap-1 px-1.5! py-1! font-mono rounded-full text-[10px] shadow-none",
			)}
			onClick={(e) => {
				e.stopPropagation();
				column?.setFilterValue(undefined);
			}}
			onKeyDown={(e) => {
				e.stopPropagation();
				if (e.code === "Enter") {
					column?.setFilterValue(undefined);
				}
			}}
		>
			<span>{filters.length}</span>
			<X className="ml-1! size-2.5! text-muted-foreground" />
		</button>
	);
}
