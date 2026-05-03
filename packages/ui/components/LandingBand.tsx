import React from "react";

import { cn } from "../lib";

/**
 * A component meant to be used in the landing page.
 * A fullscreen, brand-colored section that displays a title, description and some product logos.
 *
 * It should be used to 'break' page flow & highlight content such as the product's tech features or an important selling point.
 */
export const LandingBandSection = ({
	children,
	className,
	title,
	titleComponent,
	description,
	descriptionComponent,
	supportingComponent,
	withBackground = true,
	variant = "primary",
}: {
	children?: React.ReactNode;
	className?: string;
	title?: string | React.ReactNode;
	titleComponent?: React.ReactNode;
	description?: string | React.ReactNode;
	descriptionComponent?: React.ReactNode;
	supportingComponent?: React.ReactNode;
	withBackground?: boolean;
	variant?: "primary" | "secondary";
}) => {
	return (
		<section
			className={cn(
				"p-2 md:p-6 gap-6 flex w-full items-center justify-center",
				withBackground && variant === "primary"
					? "bg-primary-100/20 dark:bg-primary-100/60"
					: "",
				withBackground && variant === "secondary"
					? "bg-secondary-100/20 dark:bg-secondary-100/60"
					: "",
				className,
			)}
		>
			<div className="p-6 container-wide gap-6 lg:flex lg:flex-row w-full max-w-full items-center">
				<div
					className={cn(
						"lg:w-auto max-w-lg xl:max-w-3xl flex w-full flex-shrink-0 flex-col",
						withBackground ? "text-black" : "",
					)}
				>
					{titleComponent ||
						(title && (
							<h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">{title}</h2>
						))}

					{descriptionComponent ||
						(description && <p className="text-lg">{description}</p>)}

					{children}
				</div>

				<div
					className={cn(
						"gap-8 lg:gap-12 mt-12 lg:mt-0 lg:max-w-lg xl:max-w-none ml-auto flex flex-shrink",
						withBackground ? "text-black" : "",
						className,
					)}
				>
					{supportingComponent}
				</div>
			</div>
		</section>
	);
};
