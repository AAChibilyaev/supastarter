"use client";

import * as React from "react";

import { cn } from "../lib";

/**
 * GlassIcons — glassmorphism icon buttons with a 3D tilt effect on hover.
 * Adapted from react-bits (DavidHDev/react-bits, MIT).
 *
 * Usage:
 *   <GlassIcons items={[
 *     { icon: <SearchIcon />, label: "Search", color: "blue" },
 *     { icon: <ZapIcon />, label: "Fast", color: "indigo" },
 *   ]} />
 */

const GRADIENT_MAP: Record<string, string> = {
	blue: "linear-gradient(hsl(223,90%,50%), hsl(208,90%,50%))",
	purple: "linear-gradient(hsl(283,90%,50%), hsl(268,90%,50%))",
	red: "linear-gradient(hsl(3,90%,50%), hsl(348,90%,50%))",
	indigo: "linear-gradient(hsl(253,90%,50%), hsl(238,90%,50%))",
	orange: "linear-gradient(hsl(43,90%,50%), hsl(28,90%,50%))",
	green: "linear-gradient(hsl(123,90%,40%), hsl(108,90%,40%))",
};

export interface GlassIconItem {
	icon: React.ReactNode;
	label: string;
	/**
	 * One of the preset color names ("blue" | "purple" | "red" | "indigo" | "orange" | "green")
	 * or any valid CSS gradient / color string.
	 */
	color: string;
	className?: string;
	onClick?: () => void;
}

interface GlassIconsProps {
	items: GlassIconItem[];
	className?: string;
	/** Grid columns. Defaults to a responsive 3-col grid. */
	columns?: 2 | 3 | 4 | 6;
}

const COLUMN_CLASSES: Record<number, string> = {
	2: "grid-cols-2",
	3: "grid-cols-2 sm:grid-cols-3",
	4: "grid-cols-2 sm:grid-cols-4",
	6: "grid-cols-3 sm:grid-cols-6",
};

export function GlassIcons({ items, className, columns = 3 }: GlassIconsProps) {
	return (
		<div
			className={cn(
				"gap-8 grid overflow-visible",
				COLUMN_CLASSES[columns] ?? COLUMN_CLASSES[3],
				className,
			)}
		>
			{items.map((item, index) => (
				<GlassIconButton key={index} item={item} />
			))}
		</div>
	);
}

function GlassIconButton({ item }: { item: GlassIconItem }) {
	const background = GRADIENT_MAP[item.color] ?? item.color;

	return (
		<button
			type="button"
			aria-label={item.label}
			onClick={item.onClick}
			className={cn(
				// container — perspective + preserve-3d for 3D tilt
				"group relative h-[4.5em] w-[4.5em] cursor-pointer border-none bg-transparent",
				"[perspective:24em] [transform-style:preserve-3d]",
				"[-webkit-tap-highlight-color:transparent]",
				item.className,
			)}
		>
			{/* Back face — tilted colored gradient */}
			<span
				aria-hidden="true"
				className={cn(
					"inset-0 absolute block rounded-[1.25em]",
					"[box-shadow:0.5em_-0.5em_0.75em_hsla(223,10%,10%,0.15)]",
					"[transition:transform_0.3s_cubic-bezier(0.83,0,0.17,1)]",
					"[transform-origin:100%_100%] [transform:rotate(15deg)]",
					"group-hover:[transform:rotate(25deg)_translate3d(-0.5em,-0.5em,0.5em)]",
					"group-focus-visible:[transform:rotate(25deg)_translate3d(-0.5em,-0.5em,0.5em)]",
				)}
				style={{ background }}
			/>

			{/* Front face — glass surface */}
			<span
				aria-hidden="true"
				className={cn(
					"inset-0 absolute flex items-center justify-center rounded-[1.25em]",
					"bg-white/15 backdrop-blur-[0.75em]",
					"[box-shadow:0_0_0_0.1em_rgba(255,255,255,0.3)_inset]",
					"[transition:transform_0.3s_cubic-bezier(0.83,0,0.17,1)]",
					"[transform-origin:80%_50%]",
					"group-hover:[transform:translate3d(0,0,2em)]",
					"group-focus-visible:[transform:translate3d(0,0,2em)]",
				)}
			>
				<span className="flex h-[1.5em] w-[1.5em] items-center justify-center">
					{item.icon}
				</span>
			</span>

			{/* Label beneath */}
			<span
				className={cn(
					"right-0 left-0 leading-loose absolute top-full text-center text-[1em] whitespace-nowrap",
					"opacity-0 [transition:opacity_0.3s_cubic-bezier(0.83,0,0.17,1),transform_0.3s_cubic-bezier(0.83,0,0.17,1)]",
					"[transform:translateY(0)]",
					"group-hover:[transform:translateY(20%)] group-hover:opacity-100",
					"group-focus-visible:[transform:translateY(20%)] group-focus-visible:opacity-100",
				)}
			>
				{item.label}
			</span>
		</button>
	);
}
