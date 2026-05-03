"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { useDebounce } from "../../hooks/use-debounce";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { Label } from "../label";
import { useDataTable } from "./data-table-provider";
import type { DataTableInputFilterField } from "./types";

function getFilter(filterValue: unknown) {
	return typeof filterValue === "string" ? filterValue : null;
}

export function DataTableFilterInput<TData>({ value: _value }: DataTableInputFilterField<TData>) {
	const value = _value as string;
	const { table, columnFilters } = useDataTable();
	const column = table.getColumn(value);
	const filterValue = columnFilters.find((i) => i.id === value)?.value;
	const filters = getFilter(filterValue);
	const [input, setInput] = useState<string | null>(filters);

	const debouncedInput = useDebounce(input, 500);

	useEffect(() => {
		const newValue = debouncedInput?.trim() === "" ? null : debouncedInput;
		if (debouncedInput === null) return;
		column?.setFilterValue(newValue);
	}, [debouncedInput, column]);

	useEffect(() => {
		if (debouncedInput?.trim() !== filters) {
			setInput(filters);
		}
	}, [filters, debouncedInput]);

	return (
		<div className="gap-1.5 grid w-full">
			<Label htmlFor={value} className="px-2 sr-only text-muted-foreground">
				{value}
			</Label>
			<InputGroup className="h-9 rounded-lg shadow-none">
				<InputGroupAddon>
					<Search className="mt-0.5 h-4 w-4" />
				</InputGroupAddon>
				<InputGroupInput
					placeholder="Search"
					name={value}
					id={value}
					value={input || ""}
					onChange={(e) => setInput(e.target.value)}
				/>
			</InputGroup>
		</div>
	);
}
