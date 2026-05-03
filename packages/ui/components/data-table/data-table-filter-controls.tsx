"use client";

import * as React from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../accordion";
import { DataTableFilterCheckbox } from "./data-table-filter-checkbox";
import { DataTableFilterInput } from "./data-table-filter-input";
import { DataTableFilterResetButton } from "./data-table-filter-reset-button";
import { DataTableFilterSlider } from "./data-table-filter-slider";
import { DataTableFilterTimerange } from "./data-table-filter-timerange";
import { useDataTable } from "./data-table-provider";

export const FILTER_COMPONENTS: Record<string, React.ComponentType<any>> = {
	checkbox: DataTableFilterCheckbox,
	input: DataTableFilterInput,
	slider: DataTableFilterSlider,
	timerange: DataTableFilterTimerange,
};

export function DataTableFilterControls() {
	const { filterFields } = useDataTable();
	const [isMounted, setIsMounted] = React.useState(false);

	React.useEffect(() => {
		const timer = setTimeout(() => setIsMounted(true), 0);
		return () => clearTimeout(timer);
	}, []);

	return (
		<Accordion
			type="multiple"
			className={isMounted ? undefined : "[&_[data-slot=accordion-content]]:!animate-none"}
			defaultValue={filterFields
				?.filter(({ defaultOpen }) => defaultOpen)
				?.map(({ value }) => value as string)}
		>
			{filterFields?.map((field) => {
				const value = field.value as string;
				const FilterComponent = FILTER_COMPONENTS[field.type];
				if (!FilterComponent) return null;
				return (
					<AccordionItem key={value} value={value} className="border-none">
						<AccordionTrigger className="px-2 py-0 w-full items-center hover:no-underline data-[state=closed]:text-muted-foreground focus-within:data-[state=closed]:text-foreground hover:data-[state=closed]:text-foreground data-[state=open]:text-foreground">
							<div className="gap-2 py-2 flex w-full items-center justify-between truncate">
								<div className="gap-2 flex items-center truncate">
									<p className="text-sm font-medium">{field.label}</p>
									{value !== field.label.toLowerCase() &&
									!field.commandDisabled ? (
										<p className="font-mono mt-px truncate text-[10px] text-muted-foreground">
											{value}
										</p>
									) : null}
								</div>
								<DataTableFilterResetButton {...field} />
							</div>
						</AccordionTrigger>
						<AccordionContent>
							<div className="p-1">
								<FilterComponent {...field} />
							</div>
						</AccordionContent>
					</AccordionItem>
				);
			})}
		</Accordion>
	);
}
