"use client";

import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@repo/ui/components/command";
import { cn } from "@repo/ui/lib";
import {
	BarChart3Icon,
	BookOpenIcon,
	CameraIcon,
	ImageIcon,
	KeyIcon,
	KeyboardIcon,
	MessageSquareIcon,
	MicIcon,
	SearchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

type SearchMode = "text" | "voice" | "photo" | "image" | "chat";

interface SearchHit {
	id: string;
	title: string;
	description: string;
	url?: string;
	category?: string;
}

interface SearchResult {
	hits: SearchHit[];
	found: number;
	timeMs: number;
}

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */

const MODES: { key: SearchMode; icon: typeof SearchIcon; label: string }[] = [
	{ key: "text", icon: SearchIcon, label: "Text" },
	{ key: "voice", icon: MicIcon, label: "Voice" },
	{ key: "photo", icon: CameraIcon, label: "Photo" },
	{ key: "image", icon: ImageIcon, label: "Image" },
	{ key: "chat", icon: MessageSquareIcon, label: "AI Chat" },
];

const MODE_STATUS: Record<SearchMode, string | undefined> = {
	text: undefined,
	voice: "Private beta",
	photo: "Coming soon",
	image: "Coming soon",
	chat: "Private beta",
};

const SUGGESTIONS = [
	{ icon: "💡", text: "What can AACsearch do?" },
	{ icon: "💰", text: "Compare pricing plans" },
	{ icon: "🔧", text: "How to integrate?" },
	{ icon: "⚡", text: "Migration from Algolia" },
];

const MOCK_RESULTS: Record<string, SearchResult> = {
	default: {
		found: 0,
		timeMs: 0,
		hits: [],
	},
};

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */

export function AACSearchUI() {
	const t = useTranslations("home");
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [mode, setMode] = useState<SearchMode>("text");
	const [results, setResults] = useState<SearchHit[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(true);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	// Global Cmd+K
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	// Focus when opened
	useEffect(() => {
		if (open) {
			// Focus is handled by cmdk CommandInput internally
		} else {
			setQuery("");
			setResults([]);
			setTotal(0);
			setShowSuggestions(true);
		}
	}, [open]);

	// Debounced search
	const performSearch = useCallback(async (q: string) => {
		if (!q.trim()) {
			setResults([]);
			setTotal(0);
			setShowSuggestions(true);
			return;
		}

		setLoading(true);
		setShowSuggestions(false);

		// Simulate search with delay
		await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

		// Mock results for demo
		const mockHits: SearchHit[] = [
			{
				id: "1",
				title: `Results for "${q}"`,
				description: "Full-text + semantic hybrid search across all indexed content.",
				url: "/docs",
				category: "feature",
			},
			{
				id: "2",
				title: "Getting Started with AACsearch",
				description: "Learn how to integrate AACsearch into your product in minutes.",
				url: "/docs/getting-started",
				category: "guide",
			},
			{
				id: "3",
				title: "Search API Reference",
				description: "Complete API documentation for the AACsearch search endpoint.",
				url: "/docs/api",
				category: "reference",
			},
			{
				id: "4",
				title: "Pricing Plans",
				description: `Compare plans and pricing for "${q}" use cases.`,
				url: "/pricing",
				category: "pricing",
			},
		];

		setResults(mockHits);
		setTotal(42);
		setLoading(false);
	}, []);

	const handleInput = useCallback(
		(val: string) => {
			setQuery(val);
			if (debounceRef.current) clearTimeout(debounceRef.current);
			if (val.trim()) {
				debounceRef.current = setTimeout(() => performSearch(val), 250);
			} else {
				setResults([]);
				setTotal(0);
				setShowSuggestions(true);
			}
		},
		[performSearch],
	);

	const handleModeSelect = useCallback((m: SearchMode) => {
		setMode(m);
		setOpen(false);
		setTimeout(() => setOpen(true), 300);
	}, []);

	const handleSuggestion = useCallback(
		(text: string) => {
			setQuery(text);
			setShowSuggestions(false);
			performSearch(text);
		},
		[performSearch],
	);

	return (
		<>
			{/* Desktop search bar trigger */}
			<div className="max-w-2xl relative mx-auto">
				<div
					className="group shadow-sm hover:shadow-md relative cursor-pointer rounded-xl border border-border bg-card transition-all duration-300 hover:border-muted-foreground/20"
					role="button"
					tabIndex={0}
					onClick={() => setOpen(true)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							setOpen(true);
						}
					}}
					aria-label="Open AACsearch"
				>
					<div className="h-12 gap-3 px-4 sm:h-14 sm:px-5 flex items-center">
						<SearchIcon className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />
						<span className="text-sm font-light flex-1 text-left text-muted-foreground/50 transition-colors group-hover:text-muted-foreground/70">
							Search anything — text, voice, images...
						</span>
						<div className="gap-1 flex items-center">
							{MODES.map(({ key, icon: Icon }) => (
								<span
									key={key}
									className={cn(
										"size-7 sm:size-8 flex items-center justify-center rounded-md",
										mode === key
											? "bg-muted text-foreground"
											: "text-muted-foreground/30",
									)}
								>
									<Icon className="size-3.5 sm:size-4" />
								</span>
							))}
						</div>
						<span className="gap-0.5 px-1.5 py-0.5 font-medium sm:inline-flex hidden shrink-0 items-center rounded-md border border-border/60 bg-muted/30 text-[10px] text-muted-foreground/50">
							<KeyboardIcon className="size-2.5" />
							<span>K</span>
						</span>
					</div>
				</div>
			</div>

			{/* ─── CommandDialog (Cmd+K Search Palette) ────── */}
			<CommandDialog open={open} onOpenChange={setOpen}>
				<Command shouldFilter={false} className="rounded-lg">
					<div className="flex items-center border-b">
						<div className="flex-1">
							<CommandInput
								value={query}
								onValueChange={handleInput}
								placeholder="Search documentation, products, guides..."
								className="h-12"
							/>
						</div>

						{/* Mode icons in header */}
						<div className="gap-0.5 pr-3 flex items-center">
							{MODES.map(({ key, icon: Icon }) => (
								<button
									key={key}
									type="button"
									onClick={() => handleModeSelect(key)}
									className={cn(
										"size-8 flex items-center justify-center rounded-md transition-colors",
										mode === key
											? "bg-muted text-foreground"
											: "text-muted-foreground/40 hover:text-muted-foreground",
									)}
									aria-label={`Search by ${key}`}
								>
									<Icon className="size-4" />
								</button>
							))}
						</div>
					</div>

					<CommandList>
						{/* Loading state */}
						{loading && (
							<div className="py-12 flex items-center justify-center">
								<div className="gap-2 text-sm flex items-center text-muted-foreground">
									<div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
									<span>Searching...</span>
								</div>
							</div>
						)}

						{/* Results */}
						{!loading && results.length > 0 && (
							<>
								<div className="px-4 py-2 text-xs text-muted-foreground/60">
									{total} results in ~300ms
								</div>
								<CommandGroup heading="Results">
									{results.map((hit) => (
										<CommandItem
											key={hit.id}
											onSelect={() => {
												if (hit.url) window.open(hit.url, "_self");
												setOpen(false);
											}}
											className="gap-0.5 py-3 flex flex-col items-start"
										>
											<div className="gap-2 flex w-full items-center">
												<SearchIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
												<span className="text-sm font-medium">
													{hit.title}
												</span>
												{hit.category && (
													<span className="px-2 py-0.5 ml-auto rounded-full bg-muted text-[10px] text-muted-foreground/70">
														{hit.category}
													</span>
												)}
											</div>
											<p className="pl-6 text-xs line-clamp-1 text-muted-foreground/60">
												{hit.description}
											</p>
										</CommandItem>
									))}
								</CommandGroup>
							</>
						)}

						{/* Empty state */}
						{!loading && query && results.length === 0 && (
							<CommandEmpty>
								<div className="py-12 text-center">
									<SearchIcon className="size-8 mb-3 mx-auto text-muted-foreground/20" />
									<p className="text-sm text-muted-foreground/60">
										No results for &ldquo;{query}&rdquo;
									</p>
									<p className="text-xs mt-1 text-muted-foreground/40">
										Try a different search mode above
									</p>
								</div>
							</CommandEmpty>
						)}

						{/* Suggestions (shown when no query) */}
						{!loading && showSuggestions && !query && (
							<>
								<CommandGroup heading="Search modes">
									{MODES.map(({ key, icon: Icon, label }) => (
										<CommandItem
											key={key}
											onSelect={() => handleModeSelect(key)}
										>
											<Icon className="size-4 shrink-0" />
											<span className="flex-1">{label}</span>
											{MODE_STATUS[key] && (
												<span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground/60">
													{MODE_STATUS[key]}
												</span>
											)}
										</CommandItem>
									))}
								</CommandGroup>

								<CommandSeparator />

								<CommandGroup heading="Quick actions">
									<CommandItem
										onSelect={() => {
											window.open("/docs", "_self");
											setOpen(false);
										}}
									>
										<BookOpenIcon className="size-4 shrink-0" />
										<span>Documentation</span>
									</CommandItem>
									<CommandItem
										onSelect={() => {
											window.open("/pricing", "_self");
											setOpen(false);
										}}
									>
										<BarChart3Icon className="size-4 shrink-0" />
										<span>Pricing</span>
									</CommandItem>
									<CommandItem
										onSelect={() => {
											window.open("https://app.aacsearch.com", "_blank");
											setOpen(false);
										}}
									>
										<KeyIcon className="size-4 shrink-0" />
										<span>Dashboard</span>
									</CommandItem>
								</CommandGroup>

								<CommandSeparator />

								<CommandGroup heading="Try asking">
									{SUGGESTIONS.map((s) => (
										<CommandItem
											key={s.text}
											onSelect={() => handleSuggestion(s.text)}
										>
											<span className="text-base mr-2">{s.icon}</span>
											<span>{s.text}</span>
										</CommandItem>
									))}
								</CommandGroup>
							</>
						)}
					</CommandList>

					<div className="px-4 py-2 flex items-center justify-between border-t text-[10px] text-muted-foreground/50">
						<span>Powered by AACsearch Engine</span>
						<span>
							<KeyboardIcon className="size-2.5 mr-0.5 inline" />K Open · ↑↓ Navigate
							· Esc Close
						</span>
					</div>
				</Command>
			</CommandDialog>
		</>
	);
}
