/**
 * AACSearch-powered search dialog for the docs site (dogfood).
 *
 * Replaces Fumadocs' built-in search with our own AACsearch Engine.
 * Controlled by Fumadocs SearchProvider (Cmd+K handler).
 *
 * Environment variable: NEXT_PUBLIC_AACSEARCH_SEARCH_KEY
 *   — A search-scoped API key (ss_search_*) that the browser can safely use.
 *   - If not set, the component falls back gracefully (hidden/disabled).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SearchHit {
	document: {
		id: string;
		title: string;
		description: string;
		content: string;
		url: string;
		locale: string;
		category: string;
	};
	highlight?: {
		title?: string;
		content?: string;
	};
	text_match?: number;
}

interface SearchResponse {
	hits: SearchHit[];
	found: number;
	page: number;
	per_page: number;
}

export function AacsearchDocsSearch({
	locale,
	open,
	onOpenChange,
}: {
	locale: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchHit[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>();
	const searchKey =
		typeof window !== "undefined"
			? (window as Record<string, string>).NEXT_PUBLIC_AACSEARCH_SEARCH_KEY || ""
			: "";
	const baseUrl =
		typeof window !== "undefined"
			? (window as Record<string, string>).NEXT_PUBLIC_AACSEARCH_BASE_URL ||
				"http://localhost:3000"
			: "http://localhost:3000";

	// Focus input when opened
	useEffect(() => {
		if (open && inputRef.current) {
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [open]);

	// Clear state when dialog closes
	useEffect(() => {
		if (!open) {
			setQuery("");
			setResults([]);
			setTotal(0);
			setError(null);
		}
	}, [open]);

	// Debounced search
	const performSearch = useCallback(
		async (q: string) => {
			if (!q.trim() || !searchKey) {
				setResults([]);
				setTotal(0);
				setLoading(false);
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const res = await fetch(
					`${baseUrl}/api/v1/indexes/docs/search`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-API-Key": searchKey,
						},
						body: JSON.stringify({
							q: q.trim(),
							query_by: "title,content,description",
							per_page: 10,
							filter_by: `locale:=${locale}`,
							highlight_fields: "title,content",
							highlight_full_fields: "title,content",
						}),
					},
				);

				if (!res.ok) {
					throw new Error(`Search failed: ${res.status}`);
				}

				const data = (await res.json()) as SearchResponse;
				setResults(data.hits || []);
				setTotal(data.found || 0);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Search failed");
				setResults([]);
			} finally {
				setLoading(false);
			}
		},
		[searchKey, baseUrl, locale],
	);

	const handleInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const val = e.target.value;
			setQuery(val);
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => performSearch(val), 250);
		},
		[performSearch],
	);

	// No search key configured — render nothing (graceful fallback)
	if (!searchKey) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh] backdrop-blur-sm"
			onClick={(e) => {
				if (e.target === e.currentTarget) onOpenChange(false);
			}}
		>
			<div className="w-full max-w-2xl overflow-hidden rounded-xl border bg-background shadow-2xl">
				<div className="flex items-center border-b px-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="shrink-0 text-muted-foreground"
					>
						<circle cx="11" cy="11" r="8" />
						<path d="m21 21-4.3-4.3" />
					</svg>
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={handleInput}
						placeholder="Search documentation..."
						className="flex-1 bg-transparent px-3 py-4 text-sm outline-none placeholder:text-muted-foreground"
						autoComplete="off"
						spellCheck={false}
					/>
					{query && (
						<button
							type="button"
							onClick={() => {
								setQuery("");
								setResults([]);
								setTotal(0);
								inputRef.current?.focus();
							}}
							className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary"
							aria-label="Clear search"
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
								<path d="M18 6 6 18" />
								<path d="m6 6 12 12" />
							</svg>
						</button>
					)}
				</div>

				<div className="max-h-[50vh] overflow-y-auto">
					{loading && (
						<div className="flex items-center justify-center py-8">
							<div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
						</div>
					)}

					{error && (
						<div className="px-4 py-6 text-center text-sm text-destructive">
							{error}
						</div>
					)}

					{!loading && !error && query && results.length === 0 && total === 0 && (
						<div className="px-4 py-8 text-center text-sm text-muted-foreground">
							No results found for "{query}"
						</div>
					)}

					{!loading && !error && results.length > 0 && (
						<>
							<div className="px-4 py-2 text-xs text-muted-foreground">
								{total} result{total !== 1 ? "s" : ""}
							</div>
							<ul className="divide-y">
								{results.map((hit) => (
									<li key={hit.document.id}>
										<a
											href={hit.document.url}
											onClick={() => onOpenChange(false)}
											className="block px-4 py-3 transition-colors hover:bg-secondary/50"
										>
											<div
												className="text-sm font-medium"
												dangerouslySetInnerHTML={{
													__html:
														hit.highlight?.title ||
														hit.document.title,
												}}
											/>
											{hit.document.description && (
												<p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
													{hit.document.description}
												</p>
											)}
											{hit.highlight?.content && (
												<p
													className="mt-1 text-xs text-muted-foreground line-clamp-2"
													dangerouslySetInnerHTML={{
														__html: hit.highlight.content,
													}}
												/>
											)}
											{hit.document.category !== "general" && (
												<span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
													{hit.document.category}
												</span>
											)}
										</a>
									</li>
								))}
							</ul>
						</>
					)}

					{!loading && !query && (
						<div className="px-4 py-8 text-center text-sm text-muted-foreground">
							Type to search documentation
						</div>
					)}
				</div>

				<div className="flex items-center justify-between border-t px-4 py-2 text-[10px] text-muted-foreground">
					<span>Powered by AACsearch Engine</span>
					<span>↑↓ Navigate · Enter Open · Esc Close</span>
				</div>
			</div>
		</div>
	);
}
