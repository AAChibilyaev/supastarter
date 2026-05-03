"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "../lib";
import { buttonVariants } from "./button";
import { GlowBg } from "./GlowBg";

/**
 * A component meant to be used to show a pricing plan in the landing page, typically used with LandingPricingSection.
 */
export const LandingPricingPlan = ({
	className,
	children,
	title,
	titleComponent,
	description,
	descriptionComponent,
	href = "#",
	onClick = () => {},
	ctaText = "Get started",
	price,
	discountPrice,
	priceSuffix,
	featured,
	highlighted,
	soldOut,
}: {
	className?: string;
	children: React.ReactNode;
	title?: string;
	titleComponent?: React.ReactNode;
	description?: string;
	descriptionComponent?: React.ReactNode;
	href?: string;
	onClick?: () => void;
	ctaText?: string;
	price: string;
	discountPrice?: string;
	priceSuffix?: string;
	featured?: boolean;
	highlighted?: boolean;
	soldOut?: boolean;
}) => {
	return (
		<div
			className={cn(
				"max-w-xs p-8 xl:p-10 relative overflow-hidden rounded-3xl border",
				highlighted
					? "bg-white dark:bg-gray-900/80 border-primary-500/50 dark:border-primary-700/50"
					: "",
				featured ? "bg-gray-900 border-gray-900 dark:bg-gray-100 dark:border-gray-100" : "",
				!featured && !highlighted
					? "bg-white dark:bg-gray-900/80 border-gray-300/70 dark:border-gray-700"
					: "",

				className,
			)}
		>
			{highlighted ? (
				<>
					<div
						className="left-0 top-0 pointer-events-none absolute h-full w-full bg-primary-100/5"
						aria-hidden
					></div>

					<div
						className="left-0 top-0 pointer-events-none absolute h-full w-full bg-primary-100/30 mix-blend-hard-light dark:bg-primary-100/5 dark:mix-blend-soft-light"
						aria-hidden
					></div>

					<div
						className="lg:flex left-0 pointer-events-none absolute -top-[45%] hidden h-full w-full justify-center"
						aria-hidden
					>
						<GlowBg
							className={cn("z-0 h-auto w-full opacity-100 dark:opacity-50")}
							variant="primary"
						/>
					</div>
				</>
			) : null}

			<div className="relative z-10">
				{title ? (
					<h3
						className={cn(
							"text-2xl font-bold tracking-tight",
							featured ? "text-white dark:text-black w-full" : "",
						)}
					>
						{title}
					</h3>
				) : (
					titleComponent
				)}

				{description ? (
					<p
						className={cn(
							"text-sm leading-6 w-full",
							featured
								? "text-gray-300 dark:text-gray-500"
								: "text-gray-600 dark:text-gray-400",
						)}
					>
						{description}
					</p>
				) : (
					descriptionComponent
				)}

				<p className="mt-6 gap-x-1 flex items-baseline">
					<span
						className={cn(
							featured ? "text-white dark:text-black" : "",
							"text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight",
							discountPrice ? "line-through" : "",
						)}
					>
						{price}
					</span>

					<span className={cn(featured ? "text-white dark:text-black" : "")}>
						{discountPrice}
					</span>

					{priceSuffix ? (
						<span
							className={cn(
								featured
									? "text-gray-300 dark:text-gray-500"
									: "dark:text-gray-400 text-gray-600",
								"text-sm font-semibold leading-6",
							)}
						>
							{priceSuffix}
						</span>
					) : null}
				</p>

				<a
					href={href}
					onClick={onClick}
					className={cn(
						buttonVariants({
							variant: highlighted ? "primary" : "outline",
							size: "lg",
						}),
						"mt-6 shadow-sm flex w-full",
						featured || soldOut ? "grayscale" : "",
						!highlighted && !featured ? "bg-gray-100 dark:bg-gray-600" : "",
						soldOut ? "pointer-events-none opacity-50" : "",
					)}
				>
					{soldOut ? "Sold out" : ctaText}
				</a>

				{Array.isArray(children) ? (
					<ul
						className={cn(
							featured
								? "text-gray-300 dark:text-gray-500"
								: "text-gray-700 dark:text-gray-400",
							"mt-8 space-y-3 text-sm leading-6 xl:mt-10",
						)}
					>
						{children.map((child, index) => (
							<li key={index} className="gap-x-3 flex">
								<CheckIcon
									className={cn(
										featured ? "text-white dark:text-black" : "",
										highlighted ? "text-primary-500" : "text-gray-500",
										"h-6 w-5 flex-none",
									)}
									aria-hidden="true"
								/>
								{child}
							</li>
						))}
					</ul>
				) : (
					children
				)}
			</div>
		</div>
	);
};
