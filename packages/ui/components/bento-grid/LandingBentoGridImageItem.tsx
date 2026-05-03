import React from "react";

import { cn } from "../../lib";
import { LandingBentoGridItem, ItemVariant } from "./LandingBentoGridItem";

/**
 * A specialized bento grid item with optional top text, center image, and bottom text.
 * Text elements can have different color variants (default, primary, secondary).
 */
export function LandingBentoGridImageItem({
	topText,
	topTextComponent,
	imageSrc,
	imageAlt = "",
	imageComponent,
	imageFill = true,
	imageHeight = 400,
	imageWidth = 400,
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
	imageSrc?: string;
	imageAlt?: string;
	imageComponent?: React.ReactNode;
	imageFill?: boolean;
	imageHeight?: number;
	imageWidth?: number;
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

			{imageComponent ||
				(imageSrc && (
					<div
						className={cn(
							"relative flex items-center justify-center overflow-hidden rounded-md",
							imageFill && "-mx-6",
						)}
					>
						<img
							src={imageSrc}
							alt={imageAlt}
							height={imageHeight}
							width={imageWidth}
							className={cn(imageFill ? "w-full" : "object-cover")}
						/>
					</div>
				))}

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
