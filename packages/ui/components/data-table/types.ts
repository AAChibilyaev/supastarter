import type { JSX } from "react";

export type SearchParams = {
	[key: string]: string | string[] | undefined;
};

export type DatePreset = {
	label: string;
	from: Date;
	to: Date;
	shortcut: string;
};

export type Option = {
	label: string;
	value: string | boolean | number | undefined;
};

export type Input = {
	type: "input";
	options?: Option[];
};

export type Checkbox = {
	type: "checkbox";
	component?: (props: Option) => JSX.Element | null;
	options?: Option[];
};

export type Slider = {
	type: "slider";
	min: number;
	max: number;
	options?: Option[];
	unit?: string;
};

export type Timerange = {
	type: "timerange";
	options?: Option[];
	presets?: DatePreset[];
};

export type Base<TData> = {
	label: string;
	value: keyof TData;
	defaultOpen?: boolean;
	commandDisabled?: boolean;
};

export type DataTableCheckboxFilterField<TData> = Base<TData> & Checkbox;
export type DataTableSliderFilterField<TData> = Base<TData> & Slider;
export type DataTableInputFilterField<TData> = Base<TData> & Input;
export type DataTableTimerangeFilterField<TData> = Base<TData> & Timerange;

export type DataTableFilterField<TData> =
	| DataTableCheckboxFilterField<TData>
	| DataTableSliderFilterField<TData>
	| DataTableInputFilterField<TData>
	| DataTableTimerangeFilterField<TData>;
