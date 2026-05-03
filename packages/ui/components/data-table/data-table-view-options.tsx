"use client";

import { Check, GripVertical, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "../../lib";
import { buttonVariants } from "../button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "../command";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Sortable, SortableDragHandle, SortableItem } from "../sortable";
import { useDataTable } from "./data-table-provider";

export function DataTableViewOptions() {
	const { table, enableColumnOrdering } = useDataTable();
	const [open, setOpen] = useState(false);
	const [drag, setDrag] = useState(false);
	const [search, setSearch] = useState("");

	const columnOrder = table.getState().columnOrder;

	const sortedColumns = useMemo(
		() =>
			table.getAllColumns().sort((a, b) => {
				return columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id);
			}),
		[columnOrder, table],
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					role="combobox"
					aria-expanded={open}
					className={cn(
						buttonVariants({ variant: "outline", size: "icon" }),
						"shadow-none",
					)}
				>
					<Settings2 className="h-4 w-4" />
					<span className="sr-only">View</span>
				</button>
			</PopoverTrigger>
			<PopoverContent side="bottom" align="end" className="p-0 w-[200px]">
				<Command>
					<CommandInput
						value={search}
						onValueChange={setSearch}
						placeholder="Search options..."
					/>
					<CommandList>
						<CommandEmpty>No option found.</CommandEmpty>
						<CommandGroup>
							<Sortable
								value={sortedColumns.map((c) => ({ id: c.id }))}
								onValueChange={(items) =>
									table.setColumnOrder(items.map((c) => c.id))
								}
								overlay={<div className="h-8 w-full rounded-md bg-muted/60" />}
								onDragStart={() => setDrag(true)}
								onDragEnd={() => setDrag(false)}
								onDragCancel={() => setDrag(false)}
							>
								{sortedColumns
									.filter(
										(column) =>
											typeof column.accessorFn !== "undefined" &&
											column.getCanHide(),
									)
									.map((column) => (
										<SortableItem key={column.id} value={column.id} asChild>
											<CommandItem
												value={column.id}
												onSelect={() =>
													column.toggleVisibility(!column.getIsVisible())
												}
												className={"capitalize"}
												disabled={drag}
											>
												<div
													className={cn(
														"h-4 w-4 flex items-center justify-center rounded-sm border border-foreground!",
														column.getIsVisible()
															? "bg-primary text-primary-foreground"
															: "opacity-50 [&_svg]:invisible",
													)}
												>
													<Check
														className={cn("size-3 text-background")}
													/>
												</div>
												<span>
													{column.columnDef.meta?.label || column.id}
												</span>
												<span
													data-slot="command-shortcut"
													className="hidden"
												/>
												{enableColumnOrdering && !search ? (
													<SortableDragHandle
														variant="ghost"
														size="icon"
														className="size-5 ml-auto text-muted-foreground hover:text-foreground focus:bg-muted focus:text-foreground"
													>
														<GripVertical
															className="size-4"
															aria-hidden="true"
														/>
													</SortableDragHandle>
												) : null}
											</CommandItem>
										</SortableItem>
									))}
							</Sortable>
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
