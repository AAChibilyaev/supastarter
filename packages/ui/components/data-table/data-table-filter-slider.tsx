"use client";

import { useEffect, useState } from "react";

import { useDebounce } from "../../hooks/use-debounce";
import { isArrayOfNumbers } from "../../lib/is-array";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { Label } from "../label";
import { useDataTable } from "./data-table-provider";
import { Slider } from "./slider";
import type { DataTableSliderFilterField } from "./types";

function getFilter(filterValue: unknown) {
	return typeof filterValue === "number"
		? [filterValue, filterValue]
		: Array.isArray(filterValue) && isArrayOfNumbers(filterValue)
			? filterValue.length === 1
				? [filterValue[0], filterValue[0]]
				: filterValue
			: null;
}

export function DataTableFilterSlider<TData>({
	value: _value,
	min: defaultMin,
	max: defaultMax,
	unit,
}: DataTableSliderFilterField<TData>) {
	const value = _value as string;
	const { table, columnFilters, getFacetedMinMaxValues } = useDataTable();
	const column = table.getColumn(value);
	const filterValue = columnFilters.find((i) => i.id === value)?.value;
	const filters = getFilter(filterValue);
	const [input, setInput] = useState<number[] | null>(filters);
	const [min, max] = getFacetedMinMaxValues?.(table, value) ||
		column?.getFacetedMinMaxValues() || [defaultMin, defaultMax];

	const debouncedInput = useDebounce(input, 500);

	useEffect(() => {
		if (debouncedInput?.length === 2) {
			column?.setFilterValue(debouncedInput);
		}
	}, [debouncedInput, column]);

	useEffect(() => {
		if (debouncedInput?.length !== 2) {
		} else if (!filters) {
			setInput(null);
		} else if (debouncedInput[0] !== filters[0] || debouncedInput[1] !== filters[1]) {
			setInput(filters);
		}
	}, [filters, debouncedInput]);

	return (
		<div className="gap-2 grid">
			<div className="gap-4 flex items-center">
				<div className="gap-1.5 grid w-full">
					<Label htmlFor={`min-${value}`} className="px-2 text-muted-foreground">
						Min.
					</Label>
					<InputGroup className="mb-2 h-9 font-mono rounded-lg shadow-none">
						<InputGroupInput
							placeholder="from"
							type="number"
							name={`min-${value}`}
							id={`min-${value}`}
							value={`${input?.[0] ?? min}`}
							min={min}
							max={max}
							onChange={(e) =>
								setInput((prev) => [Number(e.target.value), prev?.[1] || max])
							}
						/>
						{unit ? <InputGroupAddon align="inline-end">{unit}</InputGroupAddon> : null}
					</InputGroup>
				</div>
				<div className="gap-1.5 grid w-full">
					<Label htmlFor={`max-${value}`} className="px-2 text-muted-foreground">
						Max.
					</Label>
					<InputGroup className="mb-2 h-9 font-mono rounded-lg shadow-none">
						<InputGroupInput
							placeholder="to"
							type="number"
							name={`max-${value}`}
							id={`max-${value}`}
							value={`${input?.[1] ?? max}`}
							min={min}
							max={max}
							onChange={(e) =>
								setInput((prev) => [prev?.[0] || min, Number(e.target.value)])
							}
						/>
						{unit ? <InputGroupAddon align="inline-end">{unit}</InputGroupAddon> : null}
					</InputGroup>
				</div>
			</div>
			<Slider
				min={min}
				max={max}
				value={input?.length === 2 ? input : [min, max]}
				onValueChange={(values) => setInput(values)}
			/>
		</div>
	);
}
