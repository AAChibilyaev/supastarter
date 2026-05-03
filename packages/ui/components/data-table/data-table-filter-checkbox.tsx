"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { cn } from "../../lib";
import { formatCompactNumber } from "../../lib/format";
import { Checkbox } from "../checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { Label } from "../label";
import { Skeleton } from "../skeleton";
import { useDataTable } from "./data-table-provider";
import type { DataTableCheckboxFilterField } from "./types";

export function DataTableFilterCheckbox<TData>({
	value: _value,
	options,
	component,
}: DataTableCheckboxFilterField<TData>) {
	const value = _value as string;
	const [inputValue, setInputValue] = useState("");
	const { table, columnFilters, isLoading, getFacetedUniqueValues } = useDataTable();
	const column = table.getColumn(value);
	const filterValue = columnFilters.find((i) => i.id === value)?.value;
	const facetedValue = getFacetedUniqueValues?.(table, value) || column?.getFacetedUniqueValues();

	const Component = component;

	const filterOptions = options?.filter(
		(option) => inputValue === "" || option.label.toLowerCase().includes(inputValue.toLowerCase()),
	);

	const filters = filterValue ? (Array.isArray(filterValue) ? filterValue : [filterValue]) : [];

	if (isLoading && !filterOptions?.length)
		return (
			<div className="grid divide-y rounded-lg border border-border">
				{Array.from({ length: 3 }).map((_, index) => (
					<div key={index} className="gap-2 px-2 py-2.5 flex items-center justify-between">
						<Skeleton className="h-4 w-4 rounded-sm" />
						<Skeleton className="h-4 w-full rounded-sm" />
					</div>
				))}
			</div>
		);

	return (
		<div className="gap-2 grid">
			{options && options.length > 4 ? (
				<InputGroup className="h-9 rounded-lg shadow-none">
					<InputGroupAddon>
						<Search className="mt-0.5 h-4 w-4" />
					</InputGroupAddon>
					<InputGroupInput
						placeholder="Search"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
					/>
				</InputGroup>
			) : null}
			<div className="max-h-[200px] overflow-y-auto rounded-lg border border-border empty:border-none">
				{filterOptions?.map((option, index) => {
					const checked = filters.includes(option.value);

					return (
						<div
							key={String(option.value)}
							className={cn(
								"group space-x-2 px-2 py-2.5 relative flex items-center hover:bg-accent/50",
								index !== filterOptions.length - 1 ? "border-b" : undefined,
							)}
						>
							<Checkbox
								id={`${value}-${option.value}`}
								checked={checked}
								onCheckedChange={(checked) => {
									const newValue = checked
										? [...(filters || []), option.value]
										: filters?.filter((value) => option.value !== value);
									column?.setFilterValue(newValue?.length ? newValue : undefined);
								}}
								className="border-foreground! shadow-none"
							/>
							<Label
								htmlFor={`${value}-${option.value}`}
								className="gap-1 flex w-full items-center justify-center truncate text-foreground/70 group-hover:text-accent-foreground"
							>
								{Component ? (
									<Component {...option} />
								) : (
									<span className="font-normal truncate">{option.label}</span>
								)}
								<span className="font-mono text-xs ml-auto flex items-center justify-center">
									{isLoading ? (
										<Skeleton className="h-4 w-4" />
									) : facetedValue?.has(option.value) ? (
										formatCompactNumber(facetedValue.get(option.value) || 0)
									) : null}
								</span>
								<button
									type="button"
									onClick={() => column?.setFilterValue([option.value])}
									className={cn(
										"inset-y-0 right-0 font-normal backdrop-blur-xs absolute hidden text-muted-foreground group-hover:block hover:text-foreground",
										"rounded-md transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
									)}
								>
									<span className="px-2">only</span>
								</button>
							</Label>
						</div>
					);
				})}
			</div>
		</div>
	);
}
