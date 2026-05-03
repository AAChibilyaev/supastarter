"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { presets as defaultPresets } from "../../constants/date-preset";
import type { DatePreset } from "../../constants/date-preset";
import { useDebounce } from "../../hooks/use-debounce";
import { cn } from "../../lib";
import { Button } from "../button";
import { Calendar } from "../calendar";
import { Input } from "../input";
import { Kbd } from "../kbd";
import { Label } from "../label";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "../select";
import { Separator } from "../separator";

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
	date: DateRange | undefined;
	setDate: (date: DateRange | undefined) => void;
	presets?: DatePreset[];
}

export function DatePickerWithRange({
	className,
	date,
	setDate,
	presets = defaultPresets,
}: DatePickerWithRangeProps) {
	const [open, setOpen] = React.useState(false);
	React.useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (!open) return;

			presets.map((preset) => {
				if (preset.shortcut === e.key) {
					setDate({ from: preset.from, to: preset.to });
				}
			});
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, [setDate, presets, open]);

	return (
		<div className={cn("gap-2 grid", className)}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant="outline"
						className={cn(
							"font-normal max-w-full justify-start truncate text-left shadow-none hover:bg-muted/50",
							!date && "text-muted-foreground",
						)}
					>
						<CalendarIcon className="h-4 w-4" />
						{date?.from ? (
							date.to ? (
								<span className="truncate">
									{format(date.from, "LLL dd, y")} -{" "}
									{format(date.to, "LLL dd, y")}
								</span>
							) : (
								format(date.from, "LLL dd, y")
							)
						) : (
							<span>Pick a date</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-0 w-auto" align="start">
					<div className="sm:flex-row flex flex-col justify-between">
						<div className="sm:block hidden">
							<DatePresets onSelect={setDate} selected={date} presets={presets} />
						</div>
						<div className="p-3 sm:hidden block">
							<DatePresetsSelect
								onSelect={setDate}
								selected={date}
								presets={presets}
							/>
						</div>
						<Separator orientation="vertical" className="h-auto w-px" />
						<Calendar
							initialFocus
							mode="range"
							defaultMonth={date?.from}
							selected={date}
							onSelect={setDate}
							numberOfMonths={1}
						/>
					</div>
					<Separator />
					<CustomDateRange onSelect={setDate} selected={date} />
				</PopoverContent>
			</Popover>
		</div>
	);
}

function DatePresets({
	selected,
	onSelect,
	presets,
}: {
	selected: DateRange | undefined;
	onSelect: (date: DateRange | undefined) => void;
	presets: DatePreset[];
}) {
	return (
		<div className="gap-2 p-3 flex flex-col">
			<p className="mx-3 text-xs text-muted-foreground uppercase">Date Range</p>
			<div className="gap-1 grid">
				{presets.map(({ label, shortcut, from, to }) => {
					const isActive = selected?.from === from && selected?.to === to;
					return (
						<Button
							key={label}
							variant={isActive ? "outline" : "ghost"}
							onClick={() => onSelect({ from, to })}
							className={cn(
								"gap-6 flex items-center justify-between",
								!isActive && "border border-transparent!",
							)}
						>
							<span className="mr-auto">{label}</span>
							<Kbd className="uppercase">{shortcut}</Kbd>
						</Button>
					);
				})}
			</div>
		</div>
	);
}

function DatePresetsSelect({
	selected,
	onSelect,
	presets,
}: {
	selected: DateRange | undefined;
	onSelect: (date: DateRange | undefined) => void;
	presets: DatePreset[];
}) {
	function findPreset(from?: Date, to?: Date) {
		return presets.find((p) => p.from === from && p.to === to)?.shortcut;
	}
	const [value, setValue] = React.useState<string | undefined>(
		findPreset(selected?.from, selected?.to),
	);

	React.useEffect(() => {
		const preset = findPreset(selected?.from, selected?.to);
		if (preset === value) return;
		setValue(preset);
	}, [selected, presets]);

	return (
		<Select
			value={value}
			onValueChange={(v) => {
				const preset = presets.find((p) => p.shortcut === v);
				if (preset) {
					onSelect({ from: preset.from, to: preset.to });
				}
			}}
		>
			<SelectTrigger>
				<SelectValue placeholder="Date Presets" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Date Presets</SelectLabel>
					{presets.map(({ label, shortcut }) => {
						return (
							<SelectItem
								key={label}
								value={shortcut}
								className="flex items-center justify-between [&>span:last-child]:flex [&>span:last-child]:w-full [&>span:last-child]:justify-between"
							>
								<span>{label}</span>
								<Kbd className="ml-2 uppercase">{shortcut}</Kbd>
							</SelectItem>
						);
					})}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function CustomDateRange({
	selected,
	onSelect,
}: {
	selected: DateRange | undefined;
	onSelect: (date: DateRange | undefined) => void;
}) {
	const [dateFrom, setDateFrom] = React.useState<Date | undefined>(selected?.from);
	const [dateTo, setDateTo] = React.useState<Date | undefined>(selected?.to);
	const debounceDateFrom = useDebounce(dateFrom, 1000);
	const debounceDateTo = useDebounce(dateTo, 1000);

	const formatDateForInput = (date: Date | undefined): string => {
		if (!date) return "";
		const utcDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
		return utcDate.toISOString().slice(0, 16);
	};

	React.useEffect(() => {
		onSelect({ from: debounceDateFrom, to: debounceDateTo });
	}, [debounceDateFrom, debounceDateTo]);

	return (
		<div className="gap-2 p-3 flex flex-col">
			<p className="text-xs text-muted-foreground uppercase">Custom Range</p>
			<div className="gap-2 sm:grid-cols-2 grid">
				<div className="gap-1.5 grid w-full">
					<Label htmlFor="from">Start</Label>
					<Input
						key={formatDateForInput(selected?.from)}
						type="datetime-local"
						id="from"
						name="from"
						defaultValue={formatDateForInput(selected?.from)}
						onChange={(e) => {
							const newDate = new Date(e.target.value);
							if (!Number.isNaN(newDate.getTime())) {
								setDateFrom(newDate);
							}
						}}
						disabled={!selected?.from}
					/>
				</div>
				<div className="gap-1.5 grid w-full">
					<Label htmlFor="to">End</Label>
					<Input
						key={formatDateForInput(selected?.to)}
						type="datetime-local"
						id="to"
						name="to"
						defaultValue={formatDateForInput(selected?.to)}
						onChange={(e) => {
							const newDate = new Date(e.target.value);
							if (!Number.isNaN(newDate.getTime())) {
								setDateTo(newDate);
							}
						}}
						disabled={!selected?.to}
					/>
				</div>
			</div>
		</div>
	);
}
