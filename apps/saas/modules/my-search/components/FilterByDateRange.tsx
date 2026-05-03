"use client";

import { useTranslations } from "next-intl";

interface FilterByDateRangeProps {
	startDate: string;
	endDate: string;
	onStartDateChange: (date: string) => void;
	onEndDateChange: (date: string) => void;
}

export function FilterByDateRange({
	startDate,
	endDate,
	onStartDateChange,
	onEndDateChange,
}: FilterByDateRangeProps) {
	const t = useTranslations();

	return (
		<div className="gap-2 flex items-center">
			<label className="text-xs whitespace-nowrap text-muted-foreground">
				{t("mySearch.dateFrom")}
			</label>
			<input
				type="date"
				value={startDate}
				onChange={(e) => onStartDateChange(e.target.value)}
				className="h-8 rounded px-2 text-xs border border-input bg-background"
			/>
			<label className="text-xs whitespace-nowrap text-muted-foreground">
				{t("mySearch.dateTo")}
			</label>
			<input
				type="date"
				value={endDate}
				onChange={(e) => onEndDateChange(e.target.value)}
				className="h-8 rounded px-2 text-xs border border-input bg-background"
			/>
		</div>
	);
}
