"use client";

import { FilterIcon } from "lucide-react";
import React from "react";

import { useHotKey } from "../../hooks/use-hot-key";
import { useMediaQuery } from "../../hooks/use-media-query";
import { Button } from "../button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "../drawer";
import { Kbd } from "../kbd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../tooltip";
import { DataTableFilterControls } from "./data-table-filter-controls";

export function DataTableFilterControlsDrawer() {
	const triggerButtonRef = React.useRef<HTMLButtonElement>(null);
	const _isMobile = useMediaQuery("(max-width: 640px)");

	useHotKey(() => {
		triggerButtonRef.current?.click();
	}, "b");

	return (
		<Drawer>
			<TooltipProvider>
				<Tooltip delayDuration={100}>
					<TooltipTrigger asChild>
						<DrawerTrigger asChild>
							<Button variant="ghost" size="icon" className="h-9 w-9">
								<FilterIcon className="h-4 w-4" />
							</Button>
						</DrawerTrigger>
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
			<DrawerContent className="max-h-[calc(100dvh-4rem)]">
				<DrawerHeader className="sr-only">
					<DrawerTitle>Filters</DrawerTitle>
					<DrawerDescription>Adjust your table filters</DrawerDescription>
				</DrawerHeader>
				<div className="px-4 flex-1 overflow-y-auto">
					<DataTableFilterControls />
				</div>
				<DrawerFooter>
					<DrawerClose asChild>
						<Button variant="outline" className="w-full">
							Close
						</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
