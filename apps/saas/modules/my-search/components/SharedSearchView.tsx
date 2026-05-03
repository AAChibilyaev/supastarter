"use client";

import { Loader2Icon, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SharedDocument {
	id?: string;
	name?: string;
	description?: string;
	category?: string;
	price?: number;
	_score?: number;
	[key: string]: unknown;
}

interface ShareSearchResponse {
	found: number;
	page: number;
	hits: SharedDocument[];
	facet_counts: Array<{
		field_name?: string;
		counts?: Array<{ value?: string; count?: number }>;
	}>;
	search_time_ms: number;
}

interface SharedSearchViewProps {
	token: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_SAAS_URL || "http://localhost:3000";

export function SharedSearchView({ token }: SharedSearchViewProps) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<ShareSearchResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

	const doSearch = useCallback(
		async (q: string) => {
			setLoading(true);
			setError(null);

			try {
				const res = await fetch(`${BASE_URL}/api/share/search/${token}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						q: q || "*",
						perPage: 20,
					}),
				});

				if (!res.ok) {
					if (res.status === 401) {
						setError("This share link is invalid or has expired.");
					} else {
						setError("Search failed. Please try again.");
					}
					setResults(null);
					return;
				}

				const data: ShareSearchResponse = await res.json();
				setResults(data);
			} catch {
				setError("Could not connect to the search server.");
				setResults(null);
			} finally {
				setLoading(false);
			}
		},
		[token],
	);

	// Initial search on mount
	useEffect(() => {
		void doSearch("*");
	}, [doSearch]);

	const handleSearch = (value: string) => {
		setQuery(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			void doSearch(value || "*");
		}, 300);
	};

	if (error) {
		return (
			<div className="max-w-lg py-16 mx-auto text-center">
				<div className="p-8 rounded-lg border border-destructive/30 bg-destructive/5">
					<SearchIcon className="size-10 mb-4 mx-auto text-destructive/50" />
					<h2 className="text-lg font-semibold mb-2">Search Unavailable</h2>
					<p className="text-sm text-muted-foreground">{error}</p>
				</div>
			</div>
		);
	}

	const formatPrice = (price?: number) => {
		if (price === undefined) return "";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(price / 100);
	};

	return (
		<div className="space-y-6">
			{/* Search input */}
			<div className="max-w-xl mx-auto">
				<div className="relative">
					<SearchIcon className="left-3.5 size-4 absolute top-1/2 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						value={query}
						onChange={(e) => handleSearch(e.target.value)}
						placeholder="Search shared index..."
						className="h-11 pl-10 pr-4 text-sm shadow-sm w-full rounded-lg border border-border bg-background transition-all focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
					/>
				</div>
			</div>

			{/* Loading */}
			{loading && (
				<div className="py-12 flex justify-center">
					<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
				</div>
			)}

			{/* Results */}
			{results && !loading && (
				<>
					<p className="text-sm text-muted-foreground">
						{results.found} result{results.found !== 1 ? "s" : ""} found
						{results.search_time_ms > 0 && ` (${results.search_time_ms.toFixed(0)}ms)`}
					</p>

					{results.hits.length === 0 ? (
						<div className="py-12 text-center">
							<p className="text-muted-foreground">No results found.</p>
						</div>
					) : (
						<div className="gap-4 sm:grid-cols-2 lg:grid-cols-3 grid">
							{results.hits.map((doc, i) => {
								const imgSrc = doc.image as string | undefined;
								return (
									<div
										key={doc.id ?? i}
										className="hover:shadow-sm overflow-hidden rounded-lg border border-border bg-card transition-shadow"
									>
										{imgSrc ? (
											<div className="aspect-[4/3] overflow-hidden bg-muted">
												<img
													src={imgSrc}
													alt={String(doc.name ?? "")}
													className="h-full w-full object-cover"
													loading="lazy"
												/>
											</div>
										) : (
											<div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-muted to-muted/50">
												<span className="text-3xl font-bold text-muted-foreground/30">
													{String(doc.name ?? "?")[0]}
												</span>
											</div>
										)}
										<div className="p-3 space-y-1.5">
											<div className="gap-2 flex items-start justify-between">
												<h3 className="text-sm font-medium line-clamp-2">
													{String(doc.name ?? "")}
												</h3>
												{doc.price !== undefined && (
													<span className="text-sm font-semibold shrink-0">
														{formatPrice(doc.price as number)}
													</span>
												)}
											</div>
											{doc.category && (
												<span className="px-2 py-0.5 text-xs inline-flex items-center rounded-full bg-muted text-muted-foreground">
													{String(doc.category)}
												</span>
											)}
											{doc.description && (
												<p className="text-xs line-clamp-2 text-muted-foreground">
													{String(doc.description)}
												</p>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</>
			)}
		</div>
	);
}
