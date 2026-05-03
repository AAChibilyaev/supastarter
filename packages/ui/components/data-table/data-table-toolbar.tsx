"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useHotKey } from "../../hooks/use-hot-key";
import { formatCompactNumber } from "../../lib/format";
import { useControls } from "../../providers/controls";
import { Button } from "../button";
import { Kbd } from "../kbd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../tooltip";
import { DataTableFilterControlsDrawer } from "./data-table-filter-controls-drawer";
import { useDataTable } from "./data-table-provider";
import { DataTableResetButton } from "./data-table-reset-button";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps {
	renderActions?: () => React.ReactNode;
}

export function DataTableToolbar({ renderActions }: DataTableToolbarProps) {
	const { table, columnFilters, totalRows, filterRows } = useDataTable();
	const { open, setOpen } = useControls();
	useHotKey(() => setOpen((prev) => !prev), "b");
	const rows = {
		total: totalRows ?? table.getCoreRowModel().rows.length,
		filtered: filterRows ?? table.getFilteredRowModel().rows.length,
	};

	return (
		<div className="gap-4 flex flex-wrap items-center justify-between">
			<div className="gap-2 flex flex-wrap items-center">
				<TooltipProvider>
					<Tooltip delayDuration={100}>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								onClick={() => setOpen((prev) => !prev)}
								className="gap-2 sm:flex hidden"
							>
								{open ? (
									<>
										<PanelLeftClose className="h-4 w-4" />
										<span className="md:block hidden">Hide Controls</span>
									</>
								) : (
									<>
										<PanelLeftOpen className="h-4 w-4" />
										<span className="md:block hidden">Show Controls</span>
									</>
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right">
							<p className="text-nowrap">
								Toggle controls with{" "}
								<Kbd className="ml-1 text-muted-foreground group-hover:text-accent-foreground">
									<span className="mr-1">⌘</span>
									<span>B</span>
								</Kbd>
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<div className="sm:hidden block">
					<DataTableFilterControlsDrawer />
				</div>
				<div>
					<p className="text-sm sm:block hidden text-muted-foreground">
						<span className="font-mono font-medium">{formatCompactNumber(rows.filtered)}</span> of{" "}
						<span className="font-mono font-medium">{formatCompactNumber(rows.total)}</span> row(s){" "}
						<span className="sm:not-sr-only sr-only">filtered</span>
					</p>
					<p className="text-sm sm:hidden block text-muted-foreground">
						<span className="font-mono font-medium">{formatCompactNumber(rows.filtered)}</span>{" "}
						row(s)
					</p>
				</div>
			</div>
			<div className="gap-2 ml-auto flex items-center">
				{columnFilters.length ? <DataTableResetButton /> : null}
				{renderActions?.()}
				<DataTableViewOptions />
			</div>
		</div>
	);
}
