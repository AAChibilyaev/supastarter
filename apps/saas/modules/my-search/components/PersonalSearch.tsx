"use client";

import { Input } from "@repo/ui/components/input";
import { SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface PersonalSearchProps {
	onSearch: (query: string) => void;
	placeholder?: string;
	debounceMs?: number;
}

export function PersonalSearch({ onSearch, placeholder, debounceMs = 300 }: PersonalSearchProps) {
	const t = useTranslations();
	const [value, setValue] = useState("");
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}

		timerRef.current = setTimeout(() => {
			onSearch(value);
		}, debounceMs);

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, [value, debounceMs, onSearch]);

	const handleClear = () => {
		setValue("");
		onSearch("");
	};

	return (
		<div className="relative w-full">
			<SearchIcon className="left-3 h-4 w-4 absolute top-1/2 -translate-y-1/2 text-muted-foreground" />
			<Input
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder={placeholder ?? t("mySearch.searchPlaceholder")}
				className="pl-9 pr-9"
				aria-label={t("mySearch.searchInputLabel")}
			/>
			{value && (
				<button
					type="button"
					onClick={handleClear}
					className="right-3 absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					aria-label={t("common.clear")}
				>
					<XIcon className="h-4 w-4" />
				</button>
			)}
		</div>
	);
}
