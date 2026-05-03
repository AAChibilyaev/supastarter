"use client";

import { motion, useInView } from "motion/react";
import * as React from "react";

import { cn } from "../lib";

/**
 * AnimatedList — a scrollable list where items animate in as they enter the viewport.
 * Supports keyboard navigation (arrow keys / tab), scroll-fade gradients, and item selection.
 * Adapted from react-bits (DavidHDev/react-bits, MIT).
 *
 * Usage:
 *   <AnimatedList
 *     items={["Result 1", "Result 2"]}
 *     onItemSelect={(item, index) => console.log(item, index)}
 *   />
 *
 *   Or with React nodes:
 *   <AnimatedList items={results} renderItem={(item) => <ResultCard {...item} />} />
 */

interface AnimatedItemProps<T> {
	item: T;
	index: number;
	delay?: number;
	isSelected: boolean;
	renderItem?: (item: T, index: number) => React.ReactNode;
	itemClassName?: string;
	onMouseEnter: () => void;
	onClick: () => void;
}

function AnimatedItem<T>({
	item,
	index,
	delay = 0.05,
	isSelected,
	renderItem,
	itemClassName,
	onMouseEnter,
	onClick,
}: AnimatedItemProps<T>) {
	const ref = React.useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { amount: 0.5, once: false });

	return (
		<motion.div
			ref={ref}
			data-index={index}
			onMouseEnter={onMouseEnter}
			onClick={onClick}
			initial={{ scale: 0.7, opacity: 0 }}
			animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
			transition={{ duration: 0.2, delay }}
			className="mb-4 cursor-pointer"
		>
			{renderItem ? (
				renderItem(item, index)
			) : (
				<div
					className={cn(
						"px-4 py-3 rounded-lg transition-colors",
						isSelected
							? "bg-primary/15 text-primary"
							: "bg-muted/60 text-foreground hover:bg-muted",
						itemClassName,
					)}
				>
					<p className="m-0 text-sm">{typeof item === "string" ? item : String(item)}</p>
				</div>
			)}
		</motion.div>
	);
}

export interface AnimatedListProps<T = string> {
	items?: T[];
	onItemSelect?: (item: T, index: number) => void;
	/** Custom render function for each item. If omitted, renders item.toString(). */
	renderItem?: (item: T, index: number) => React.ReactNode;
	showGradients?: boolean;
	enableArrowNavigation?: boolean;
	className?: string;
	itemClassName?: string;
	displayScrollbar?: boolean;
	initialSelectedIndex?: number;
	/** Max height of the scroll container. Defaults to "400px". */
	maxHeight?: string;
}

export function AnimatedList<T = string>({
	items = [],
	onItemSelect,
	renderItem,
	showGradients = true,
	enableArrowNavigation = true,
	className,
	itemClassName,
	displayScrollbar = true,
	initialSelectedIndex = -1,
	maxHeight = "400px",
}: AnimatedListProps<T>) {
	const listRef = React.useRef<HTMLDivElement>(null);
	const [selectedIndex, setSelectedIndex] = React.useState(initialSelectedIndex);
	const [keyboardNav, setKeyboardNav] = React.useState(false);
	const [topGradientOpacity, setTopGradientOpacity] = React.useState(0);
	const [bottomGradientOpacity, setBottomGradientOpacity] = React.useState(1);

	const handleItemMouseEnter = React.useCallback((index: number) => {
		setSelectedIndex(index);
	}, []);

	const handleItemClick = React.useCallback(
		(item: T, index: number) => {
			setSelectedIndex(index);
			onItemSelect?.(item, index);
		},
		[onItemSelect],
	);

	const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
		setTopGradientOpacity(Math.min(scrollTop / 50, 1));
		const bottomDistance = scrollHeight - (scrollTop + clientHeight);
		setBottomGradientOpacity(
			scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1),
		);
	}, []);

	React.useEffect(() => {
		if (!enableArrowNavigation) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
				e.preventDefault();
				setKeyboardNav(true);
				setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
			} else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
				e.preventDefault();
				setKeyboardNav(true);
				setSelectedIndex((prev) => Math.max(prev - 1, 0));
			} else if (e.key === "Enter") {
				if (selectedIndex >= 0 && selectedIndex < items.length) {
					e.preventDefault();
					onItemSelect?.(items[selectedIndex], selectedIndex);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

	React.useEffect(() => {
		if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;

		const container = listRef.current;
		const selectedItem = container.querySelector<HTMLElement>(
			`[data-index="${selectedIndex}"]`,
		);

		if (selectedItem) {
			const margin = 50;
			const top = container.scrollTop;
			const height = container.clientHeight;
			const itemTop = selectedItem.offsetTop;
			const itemBottom = itemTop + selectedItem.offsetHeight;

			if (itemTop < top + margin) {
				container.scrollTo({ top: itemTop - margin, behavior: "smooth" });
			} else if (itemBottom > top + height - margin) {
				container.scrollTo({
					top: itemBottom - height + margin,
					behavior: "smooth",
				});
			}
		}

		setKeyboardNav(false);
	}, [selectedIndex, keyboardNav]);

	return (
		<div className={cn("relative w-full", className)}>
			{/* Scrollable list */}
			<div
				ref={listRef}
				onScroll={handleScroll}
				className={cn(
					"p-4 overflow-y-auto",
					!displayScrollbar && "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
				)}
				style={{ maxHeight }}
			>
				{items.map((item, index) => (
					<AnimatedItem<T>
						key={index}
						item={item}
						index={index}
						delay={0.05}
						isSelected={selectedIndex === index}
						renderItem={renderItem}
						itemClassName={itemClassName}
						onMouseEnter={() => handleItemMouseEnter(index)}
						onClick={() => handleItemClick(item, index)}
					/>
				))}
			</div>

			{/* Fade gradients */}
			{showGradients && (
				<>
					<div
						aria-hidden="true"
						className="inset-x-0 top-0 h-12 pointer-events-none absolute bg-gradient-to-b from-background to-transparent transition-opacity duration-300"
						style={{ opacity: topGradientOpacity }}
					/>
					<div
						aria-hidden="true"
						className="inset-x-0 bottom-0 h-24 pointer-events-none absolute bg-gradient-to-t from-background to-transparent transition-opacity duration-300"
						style={{ opacity: bottomGradientOpacity }}
					/>
				</>
			)}
		</div>
	);
}
