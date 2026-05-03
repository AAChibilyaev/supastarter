"use client";

import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface DemoProduct {
	id?: string;
	name?: string;
	description?: string;
	category?: string;
	brand?: string;
	price?: number;
	image?: string;
	color?: string;
	material?: string;
	_score?: number;
}

interface FacetCount {
	field_name?: string;
	counts?: Array<{ value?: string; count?: number }>;
}

interface DemoSearchResponse {
	found: number;
	page: number;
	hits: DemoProduct[];
	facet_counts: FacetCount[];
	search_time_ms: number;
}

const DEMO_API = `${process.env.NEXT_PUBLIC_SAAS_URL || "http://localhost:3000"}/api/demo/search`;

export function DemoSearchPage() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<DemoSearchResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

	const doSearch = useCallback(async (q: string, category: string | null) => {
		setLoading(true);
		setError(null);

		try {
			const filterBy = category ? `category:=${category}` : undefined;
			const res = await fetch(DEMO_API, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					q: q || "*",
					perPage: 24,
					filterBy,
					facetBy: "category,brand,color,material",
					queryBy: "name,category,description,brand",
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				if (res.status === 503) {
					setError("Demo is not configured yet. Contact the team to set up the demo.");
				} else {
					setError(data?.error ?? "Search failed. Please try again.");
				}
				setResults(null);
				return;
			}

			const data: DemoSearchResponse = await res.json();
			setResults(data);
		} catch {
			setError("Could not connect to the demo server.");
			setResults(null);
		} finally {
			setLoading(false);
		}
	}, []);

	// Initial search on mount
	useEffect(() => {
		void doSearch("*", null);
	}, [doSearch]);

	// Debounced search on query change
	const handleQueryChange = (value: string) => {
		setQuery(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			void doSearch(value || "*", selectedCategory);
		}, 300);
	};

	// Category filter
	const handleCategoryClick = (category: string | null) => {
		setSelectedCategory(category);
		void doSearch(query || "*", category);
	};

	const categories = results?.facet_counts?.find((f) => f.field_name === "category")?.counts;

	const formatPrice = (price?: number) => {
		if (price === undefined) return "";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(price / 100);
	};

	return (
		<div className="space-y-8">
			{/* Search bar */}
			<div className="max-w-2xl mx-auto">
				<div className="relative">
					<SearchIcon className="left-4 size-5 absolute top-1/2 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						value={query}
						onChange={(e) => handleQueryChange(e.target.value)}
						placeholder="Search fashion catalog..."
						className="h-14 pl-12 pr-12 text-base shadow-sm w-full rounded-xl border border-border bg-background transition-all focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
					/>
					{query && (
						<button
							type="button"
							onClick={() => {
								setQuery("");
								handleQueryChange("");
							}}
							className="right-4 absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<XIcon className="size-4" />
						</button>
					)}
				</div>
			</div>

			{/* Loading state */}
			{loading && !results && (
				<div className="py-20 flex items-center justify-center">
					<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{/* Error state */}
			{error && (
				<div className="max-w-xl py-12 mx-auto text-center">
					<div className="p-6 rounded-lg border border-destructive/30 bg-destructive/5">
						<p className="font-medium mb-2 text-destructive">Search Unavailable</p>
						<p className="text-sm text-muted-foreground">{error}</p>
					</div>
				</div>
			)}

			{/* Results */}
			{results && !error && (
				<div className="gap-8 xl:grid-cols-[280px_minmax(0,1fr)] grid">
					{/* Facets sidebar */}
					<aside className="space-y-6">
						<div>
							<h3 className="text-sm font-semibold mb-3 tracking-wider text-foreground uppercase">
								Categories
							</h3>
							<div className="space-y-1">
								<button
									type="button"
									onClick={() => handleCategoryClick(null)}
									className={`px-3 py-2 text-sm w-full rounded-lg text-left transition-colors ${
										!selectedCategory
											? "font-medium bg-primary/10 text-primary"
											: "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
									}`}
								>
									All Categories
								</button>
								{categories?.map((cat) => (
									<button
										key={cat.value}
										type="button"
										onClick={() => handleCategoryClick(cat.value ?? null)}
										className={`px-3 py-2 text-sm flex w-full items-center justify-between rounded-lg text-left transition-colors ${
											selectedCategory === cat.value
												? "font-medium bg-primary/10 text-primary"
												: "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
										}`}
									>
										<span>{cat.value}</span>
										<span className="text-xs text-muted-foreground">
											{cat.count}
										</span>
									</button>
								))}
							</div>
						</div>

						{/* Stats */}
						<div className="p-4 text-sm rounded-lg border border-border bg-muted/30 text-muted-foreground">
							<p>
								<strong className="text-foreground">{results.found}</strong>{" "}
								products found
							</p>
							<p className="mt-1">
								Search took {results.search_time_ms.toFixed(0)}ms
							</p>
						</div>

						{/* CTA */}
						<div className="p-4 rounded-lg border border-primary/20 bg-primary/5 text-center">
							<p className="text-sm font-medium mb-2 text-foreground">
								Want to try with your own data?
							</p>
							<a
								href="/pricing"
								className="px-4 py-2 text-sm font-medium inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Get Started Free
							</a>
						</div>
					</aside>

					{/* Product grid */}
					<div>
						{results.hits.length === 0 ? (
							<div className="py-16 text-center">
								<SearchIcon className="size-12 mb-4 mx-auto text-muted-foreground/40" />
								<p className="text-lg font-medium mb-1 text-foreground">
									No products found
								</p>
								<p className="text-sm text-muted-foreground">
									Try a different search term or browse all categories.
								</p>
							</div>
						) : (
							<div className="gap-4 sm:grid-cols-2 lg:grid-cols-3 grid">
								{results.hits.map((product, i) => (
									<div
										key={product.id ?? i}
										className="group hover:shadow-md overflow-hidden rounded-xl border border-border bg-card transition-shadow"
									>
										{/* Product image placeholder */}
										<div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-muted to-muted/50">
											{product.image ? (
												<img
													src={product.image}
													alt={product.name ?? ""}
													className="h-full w-full object-cover"
													loading="lazy"
												/>
											) : (
												<div className="p-4 text-center">
													<div className="size-12 mb-2 mx-auto flex items-center justify-center rounded-full bg-primary/10">
														<span className="text-xl font-bold text-primary">
															{product.name?.charAt(0) ?? "?"}
														</span>
													</div>
													<p className="text-xs text-muted-foreground">
														No image
													</p>
												</div>
											)}
										</div>

										<div className="p-4 space-y-2">
											<div className="gap-2 flex items-start justify-between">
												<h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground">
													{product.name}
												</h3>
												{product.price !== undefined && (
													<span className="text-sm font-semibold shrink-0 text-foreground">
														{formatPrice(product.price)}
													</span>
												)}
											</div>

											{product.category && (
												<span className="px-2.5 py-0.5 text-xs font-medium inline-flex items-center rounded-full bg-muted text-muted-foreground">
													{product.category}
												</span>
											)}

											{product.description && (
												<p className="text-xs line-clamp-2 text-muted-foreground">
													{product.description}
												</p>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
