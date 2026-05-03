"use client";

import { SpotlightCard as SpotlightCardPrimitive } from "@repo/ui/components/spotlight-card";
import { cn } from "@repo/ui";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";

/**
 * SearchResultSpotlightCard — wraps the SpotlightCard primitive for use in
 * search result lists, playgrounds, and preview panels.
 *
 * Spotlight color automatically adapts to the index's accent color or falls
 * back to a primary-hued glow.
 */

export interface SearchResultSpotlightCardProps {
	/** Document title */
	title: string;
	/** Short description or excerpt */
	description?: string;
	/** Document URL (shown as a subtle label) */
	url?: string;
	/** Badge / category label */
	category?: string;
	/** 1-based rank position in the result list */
	rank?: number;
	/** Relevance score (0-1) displayed as a small badge */
	score?: number;
	/** Spotlight color override. Defaults to indigo at 20% opacity. */
	spotlightColor?: string;
	className?: string;
	onClick?: () => void;
}

export function SearchResultSpotlightCard({
	title,
	description,
	url,
	category,
	rank,
	score,
	spotlightColor = "rgba(99, 102, 241, 0.2)",
	className,
	onClick,
}: SearchResultSpotlightCardProps) {
	return (
		<SpotlightCardPrimitive
			spotlightColor={spotlightColor}
			className={cn(
				"group cursor-pointer p-5 transition-colors hover:border-primary/40",
				onClick && "cursor-pointer",
				className,
			)}
			onClick={onClick}
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
			onKeyDown={
				onClick
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onClick();
							}
						}
					: undefined
			}
		>
			{/* Header row */}
			<div className="relative z-20 flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					{/* Rank + category */}
					<div className="mb-1.5 flex items-center gap-2">
						{rank !== undefined && (
							<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
								{rank}
							</span>
						)}
						{category && (
							<span className="truncate rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
								{category}
							</span>
						)}
					</div>

					{/* Title */}
					<h4 className="truncate text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
						{title}
					</h4>
				</div>

				{/* Score badge */}
				{score !== undefined && (
					<span
						className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-mono text-primary"
						title="Relevance score"
					>
						{score.toFixed(2)}
					</span>
				)}
			</div>

			{/* Description */}
			{description && (
				<p className="relative z-20 mt-2 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
					{description}
				</p>
			)}

			{/* URL */}
			{url && (
				<div className="relative z-20 mt-3 flex items-center gap-1 text-[11px] text-muted-foreground/70">
					<ExternalLinkIcon className="h-3 w-3 shrink-0" />
					<span className="truncate">{url}</span>
				</div>
			)}
		</SpotlightCardPrimitive>
	);
}
