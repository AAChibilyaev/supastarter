import { addDays, addHours, endOfDay, startOfDay } from "date-fns";

export interface DatePreset {
	label: string;
	from: Date;
	to: Date;
	shortcut: string;
}

export const presets = [
	{
		label: "Today",
		from: startOfDay(new Date()),
		to: endOfDay(new Date()),
		shortcut: "d",
	},
	{
		label: "Yesterday",
		from: startOfDay(addDays(new Date(), -1)),
		to: endOfDay(addDays(new Date(), -1)),
		shortcut: "y",
	},
	{
		label: "Last hour",
		from: addHours(new Date(), -1),
		to: new Date(),
		shortcut: "h",
	},
	{
		label: "Last 7 days",
		from: startOfDay(addDays(new Date(), -7)),
		to: endOfDay(new Date()),
		shortcut: "w",
	},
	{
		label: "Last 14 days",
		from: startOfDay(addDays(new Date(), -14)),
		to: endOfDay(new Date()),
		shortcut: "b",
	},
	{
		label: "Last 30 days",
		from: startOfDay(addDays(new Date(), -30)),
		to: endOfDay(new Date()),
		shortcut: "m",
	},
] satisfies DatePreset[];
