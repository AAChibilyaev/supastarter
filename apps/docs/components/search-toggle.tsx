/**
 * Search toggle button for the docs nav bar.
 * Opens the AACSearch-powered search dialog on click.
 */
"use client";

import { useAacsearchSearch } from "./aacsearch-search-provider";

export function SearchToggle() {
	const { setOpen } = useAacsearchSearch();

	return (
		<button
			type="button"
			onClick={() => setOpen(true)}
			className="inline-flex items-center gap-2 rounded-lg border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
			aria-label="Open search"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
			<span>Search docs...</span>
			<kbd className="hidden rounded-md border bg-muted px-1.5 text-[10px] font-medium sm:inline-block">
				⌘K
			</kbd>
		</button>
	);
}
