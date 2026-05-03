import React from "react";

import { cn } from "../../lib";
import { ColorVariant } from "./LandingBentoGridIconItem";
import { LandingBentoGridItem, ItemVariant } from "./LandingBentoGridItem";

/**
 * A specialized bento grid item with optional top text, center large number, and bottom text.
 * Each text and the number can have different color variants (default, primary, secondary).
 */
export function LandingBentoGridNumberItem({
	topText,
	topTextComponent,
	number,
	bottomText,
	bottomTextComponent,
	colSpan,
	rowSpan,
	className,
	href,
	variant = "default",
	children,
	...props
}: {
	topText?: string;
	topTextComponent?: React.ReactNode;
	number?: string | number;
	bottomText?: string;
	bottomTextComponent?: React.ReactNode;
	colSpan?: 1 | 2 | 3 | 4;
	rowSpan?: 1 | 2 | 3;
	className?: string;
	href?: string;
	variant?: ItemVariant;
	children?: React.ReactNode;
}) {
	const content = (
		<div className="gap-3 flex h-full w-full flex-col justify-center">
			{topTextComponent || (
				<div
					className={cn(
						"text-sm flex items-start justify-center text-center",
						variant === "primary" && "text-primary-500 dark:text-primary-400",
						variant === "secondary" && "text-secondary-500 dark:text-secondary-400",
						variant === "default" && "text-foreground",
					)}
				>
					{topText}
				</div>
			)}

			{number !== undefined && (
				<div
					className={cn(
						"text-3xl xl:text-5xl font-bold flex items-center justify-center",
						variant === "primary" && "text-primary-500 dark:text-primary-400",
						variant === "secondary" && "text-secondary-500 dark:text-secondary-400",
						variant === "default" && "text-foreground",
					)}
				>
					{number}
				</div>
			)}

			{bottomTextComponent || (
				<div
					className={cn(
						"text-sm flex items-end justify-center text-center",
						variant === "primary" && "text-primary-500 dark:text-primary-400",
						variant === "secondary" && "text-secondary-500 dark:text-secondary-400",
						variant === "default" && "text-muted-foreground",
					)}
				>
					{bottomText}
				</div>
			)}
		</div>
	);

	return (
		<LandingBentoGridItem
			content={content}
			colSpan={colSpan}
			rowSpan={rowSpan}
			className={className}
			href={href}
			variant={variant}
			{...props}
		>
			{children}
		</LandingBentoGridItem>
	);
}
