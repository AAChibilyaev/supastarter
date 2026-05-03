import { Search, X } from "lucide-react";
import { useTranslate } from "ra-core";
import { useCallback } from "react";
import { useWatch, useFormContext } from "react-hook-form";

import { cn } from "../../lib";
import { Button } from "../button";
import type { TextInputProps } from "./text-input";
import { TextInput } from "./text-input";

/**
 * Text input with a search icon, designed for filter forms without a label.
 *
 * It automatically uses the 'q' source for full-text search by default.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/searchinput/ SearchInput documentation}
 *
 * @example
 * import { List, DataTable, SearchInput } from '@/components/admin';
 *
 * const postListFilters = [
 *   <SearchInput source="q" alwaysOn />,
 * ];
 *
 * const PostList = () => (
 *   <List filters={postListFilters}>
 *     <DataTable>
 *       <DataTable.Col source="title" />
 *       <DataTable.Col source="author" />
 *       <DataTable.Col source="published_at" />
 *     </DataTable>
 *   </List>
 * );
 */
export const SearchInput = (inProps: SearchInputProps) => {
	const { label, className, disableClearable, source = "q", ...rest } = inProps;

	const translate = useTranslate();
	const { setValue } = useFormContext();
	const fieldValue = useWatch({ name: source });
	const hasValue = fieldValue && fieldValue !== "";

	const handleClear = useCallback(() => {
		setValue(source, "", { shouldDirty: true });
	}, [setValue, source]);

	if (label) {
		throw new Error(
			"<SearchInput> isn't designed to be used with a label prop. Use <TextInput> if you need a label.",
		);
	}

	const showClearButton = !disableClearable && hasValue;

	return (
		<div className="relative mt-auto flex flex-grow">
			<TextInput
				source={source}
				label={false}
				helperText={false}
				placeholder={translate("ra.action.search")}
				className={cn("flex-grow", className)}
				inputClassName={cn("pr-8", showClearButton ? "pr-16" : "pr-8")}
				{...rest}
			/>
			<Search className="right-3 h-4 w-4 pointer-events-none absolute top-1/2 -translate-y-1/2 transform text-muted-foreground" />
			{showClearButton && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleClear}
					className="right-8 h-6 w-6 p-0 absolute top-1/2 -translate-y-1/2 transform rounded-full text-muted-foreground"
					aria-label={translate("ra.action.clear_search", {
						_: "Clear search",
					})}
				>
					<X className="h-3 w-3" />
				</Button>
			)}
		</div>
	);
};

export type SearchInputProps = TextInputProps & {
	disableClearable?: boolean;
};
