/**
 * AACSearch search dialog integration for Fumadocs.
 *
 * Provides search-open state via React context so the toggle button
 * in the nav bar can open the search dialog.
 * Keyboard shortcut: Cmd+K / Ctrl+K to open, Escape to close.
 */
"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

const AacsearchDocsSearch = dynamic(
	() => import("./aacsearch-docs-search").then((mod) => mod.AacsearchDocsSearch),
	{ ssr: false },
);

interface SearchContextValue {
	open: boolean;
	setOpen: (value: boolean) => void;
}

const SearchContext = createContext<SearchContextValue>({
	open: false,
	setOpen: () => {},
});

export function useAacsearchSearch() {
	return useContext(SearchContext);
}

export function AacsearchSearchProvider({ children, lang }: { children: ReactNode; lang: string }) {
	const [open, setOpen] = useState(false);

	// Keyboard shortcut: Cmd+K or Ctrl+K
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setOpen(true);
			}
			if (e.key === "Escape") {
				setOpen(false);
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	const handleOpenChange = useCallback((value: boolean) => {
		setOpen(value);
	}, []);

	return (
		<SearchContext.Provider value={{ open, setOpen }}>
			{children}
			{open && <AacsearchDocsSearch locale={lang} open={open} onOpenChange={handleOpenChange} />}
		</SearchContext.Provider>
	);
}
