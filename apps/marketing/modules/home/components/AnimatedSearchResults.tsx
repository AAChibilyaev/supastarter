"use client";

import { cn } from "@repo/ui";
import { SearchIcon, StarIcon, TagIcon, ZapIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * AnimatedSearchResults — marketing demo component that shows a live search
 * results list with staggered entrance animations.
 *
 * Inspired by react-bits AnimatedList (DavidHDev/react-bits, MIT).
 * Re-implemented with IntersectionObserver + CSS transitions (no framer-motion
 * dependency) to stay within the marketing app's dependency budget.
 *
 * Usage:
 *   <AnimatedSearchResults query="wireless headphones" />
 */

interface SearchResult {
	id: string;
	title: string;
	description: string;
	category: string;
	score: number;
	badge?: "top" | "new" | "sale";
}

interface AnimatedSearchResultsProps {
	/** Query string shown in the simulated search bar */
	query?: string;
	/** Override the demo results */
	results?: SearchResult[];
	className?: string;
	onResultClick?: (result: SearchResult) => void;
	/** Show top/bottom scroll fade gradients */
	showGradients?: boolean;
	maxHeight?: string;
}

const DEFAULT_RESULTS: SearchResult[] = [
	{
		id: "1",
		title: "Sony WH-1000XM5 Wireless Headphones",
		description: "Industry-leading noise cancellation with 30-hour battery",
		category: "Electronics",
		score: 0.99,
		badge: "top",
	},
	{
		id: "2",
		title: "Apple AirPods Pro (2nd generation)",
		description: "Active Noise Cancellation, Transparency mode, Adaptive Audio",
		category: "Electronics",
		score: 0.97,
	},
	{
		id: "3",
		title: "Bose QuietComfort 45",
		description: "Wireless noise cancelling headphones, balanced audio",
		category: "Electronics",
		score: 0.94,
	},
	{
		id: "4",
		title: "Sennheiser Momentum 4 Wireless",
		description: "60-hour battery, adaptive noise cancellation, premium sound",
		category: "Electronics",
		score: 0.91,
		badge: "new",
	},
	{
		id: "5",
		title: "Jabra Evolve2 85 Wireless Headset",
		description: "Professional headset with advanced call clarity",
		category: "Business",
		score: 0.88,
	},
	{
		id: "6",
		title: "JBL Tune 770NC Wireless",
		description: "Adaptive noise cancellation, up to 70 hours battery",
		category: "Electronics",
		score: 0.85,
		badge: "sale",
	},
];

const BADGE_STYLES = {
	top: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
	new: "bg-green-500/15 text-green-600 dark:text-green-400",
	sale: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const BADGE_LABELS = {
	top: "Top Pick",
	new: "New",
	sale: "Sale",
};

function AnimatedResultItem({
	result,
	index,
	isSelected,
	onMouseEnter,
	onClick,
}: {
	result: SearchResult;
	index: number;
	isSelected: boolean;
	onMouseEnter: () => void;
	onClick: () => void;
}) {
	const ref = useRef<HTMLButtonElement>(null);
	const [visible, setVisible] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setVisible(true);
				} else {
					setVisible(false);
				}
			},
			{ threshold: 0.3 },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	return (
		<button
			ref={ref}
			type="button"
			data-index={index}
			onMouseEnter={onMouseEnter}
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick();
				}
			}}
			className="mb-3 p-0 w-full cursor-pointer bg-transparent text-left outline-none"
			style={{
				transform: mounted && visible ? "scale(1)" : "scale(0.85)",
				opacity: mounted && visible ? 1 : 0,
				transition: `transform 0.2s ease ${index * 0.06}s, opacity 0.2s ease ${index * 0.06}s`,
			}}
		>
			<div
				className={cn(
					"p-3.5 rounded-xl border transition-colors",
					isSelected
						? "border-primary/40 bg-primary/5"
						: "border-border/60 bg-card hover:border-border",
				)}
			>
				<div className="gap-3 flex items-start justify-between">
					<div className="min-w-0 flex-1">
						{/* Category + badge */}
						<div className="mb-1 gap-1.5 flex items-center">
							<TagIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
							<span className="text-[11px] text-muted-foreground">
								{result.category}
							</span>
							{result.badge && (
								<span
									className={cn(
										"px-1.5 py-0.5 font-semibold rounded-full text-[10px]",
										BADGE_STYLES[result.badge],
									)}
								>
									{BADGE_LABELS[result.badge]}
								</span>
							)}
						</div>

						{/* Title */}
						<p
							className={cn(
								"text-sm font-medium leading-snug truncate transition-colors",
								isSelected ? "text-primary" : "text-foreground",
							)}
						>
							{result.title}
						</p>

						{/* Description */}
						<p className="mt-0.5 text-xs line-clamp-1 text-muted-foreground">
							{result.description}
						</p>
					</div>

					{/* Score */}
					<div className="gap-1 flex shrink-0 items-center">
						<StarIcon className="h-3 w-3 text-yellow-500" />
						<span className="font-mono text-[11px] text-muted-foreground">
							{(result.score * 100).toFixed(0)}%
						</span>
					</div>
				</div>
			</div>
		</button>
	);
}

export function AnimatedSearchResults({
	query = "wireless headphones",
	results = DEFAULT_RESULTS,
	className,
	onResultClick,
	showGradients = true,
	maxHeight = "420px",
}: AnimatedSearchResultsProps) {
	const listRef = useRef<HTMLDivElement>(null);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const [topOpacity, setTopOpacity] = useState(0);
	const [bottomOpacity, setBottomOpacity] = useState(1);

	const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
		setTopOpacity(Math.min(scrollTop / 50, 1));
		const dist = scrollHeight - (scrollTop + clientHeight);
		setBottomOpacity(scrollHeight <= clientHeight ? 0 : Math.min(dist / 50, 1));
	}, []);

	// Arrow key navigation
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((p) => Math.min(p + 1, results.length - 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((p) => Math.max(p - 1, 0));
			} else if (e.key === "Enter" && selectedIndex >= 0) {
				e.preventDefault();
				onResultClick?.(results[selectedIndex]);
			}
		};
		window.addEventListener("keydown", down);
		return () => window.removeEventListener("keydown", down);
	}, [results, selectedIndex, onResultClick]);

	return (
		<div
			className={cn("shadow-sm w-full overflow-hidden rounded-2xl border bg-card", className)}
		>
			{/* Simulated search bar */}
			<div className="gap-2.5 px-4 py-3 flex items-center border-b">
				<SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
				<span className="text-sm flex-1 text-foreground">{query}</span>
				<div className="gap-1 flex items-center text-[11px] text-muted-foreground">
					<ZapIcon className="h-3 w-3 text-yellow-500" />
					<span>12ms</span>
				</div>
				<span className="rounded px-1.5 py-0.5 bg-muted text-[11px] text-muted-foreground">
					{results.length} results
				</span>
			</div>

			{/* Results list */}
			<div className="relative">
				<div
					ref={listRef}
					onScroll={handleScroll}
					className="p-3 overflow-y-auto [scrollbar-width:thin]"
					style={{ maxHeight }}
				>
					{results.map((result, index) => (
						<AnimatedResultItem
							key={result.id}
							result={result}
							index={index}
							isSelected={selectedIndex === index}
							onMouseEnter={() => setSelectedIndex(index)}
							onClick={() => {
								setSelectedIndex(index);
								onResultClick?.(result);
							}}
						/>
					))}
				</div>

				{showGradients && (
					<>
						<div
							aria-hidden="true"
							className="inset-x-0 top-0 h-10 pointer-events-none absolute bg-gradient-to-b from-card to-transparent transition-opacity duration-300"
							style={{ opacity: topOpacity }}
						/>
						<div
							aria-hidden="true"
							className="inset-x-0 bottom-0 h-16 pointer-events-none absolute bg-gradient-to-t from-card to-transparent transition-opacity duration-300"
							style={{ opacity: bottomOpacity }}
						/>
					</>
				)}
			</div>
		</div>
	);
}
