import { OrbitIcon } from "lucide-react";
import React from "react";

import { cn } from "../lib";
import { GlowBg } from "./GlowBg";

/**
 * A footer component meant to be used in the landing page.
 * It shows a footer with a title, description, and can render columns of links etc.
 */
export const LandingFooter = ({
	className,
	children,
	title,
	description,
	footnote,
	logoComponent,
	withBackground = false,
	withBackgroundGlow = false,
	withBackgroundGradient = false,
	variant = "primary",
	backgroundGlowVariant = "primary",
}: {
	className?: string;
	children?: React.ReactNode;
	title?: string;
	description?: string;
	footnote?: string | React.ReactNode;
	logoComponent?: React.ReactNode;
	withBackground?: boolean;
	withBackgroundGlow?: boolean;
	withBackgroundGradient?: boolean;
	variant?: "primary" | "secondary";
	backgroundGlowVariant?: "primary" | "secondary";
}) => {
	const columnNumber = React.Children.count(children);

	return (
		<footer
			className={cn(
				"mt-auto w-full bg-gradient-to-r",
				withBackground && variant === "primary" ? "bg-primary-100/20 dark:bg-primary-900/10" : "",
				withBackground && variant === "secondary"
					? "bg-secondary-100/20 dark:bg-secondary-900/10"
					: "",
				withBackgroundGlow ? "relative overflow-hidden" : "",
				withBackgroundGradient
					? "from-gray-50/5 via-gray-100/60 to-gray-50/5 backdrop-blur-sm dark:from-slate-700/5 dark:via-slate-700/60 dark:to-slate-700/5"
					: "",
				className,
			)}
		>
			{withBackgroundGlow ? (
				<div className="lg:flex pointer-events-none absolute -bottom-1/2 hidden h-full w-full justify-center">
					<GlowBg
						className={cn("z-0 h-auto w-full opacity-100 dark:opacity-50")}
						variant={backgroundGlowVariant}
					/>
				</div>
			) : null}

			<div className={cn("gap-4 p-6 flex w-full flex-col items-center justify-between")}>
				<div className="md:flex-row gap-6 mt-12 p-6 container-wide flex w-full max-w-full flex-col justify-between">
					<div className="gap-4 md:max-w-xs lg:max-w-sm flex w-full flex-col">
						<a href="/">
							{logoComponent || (
								<div className="gap-3 flex items-center justify-start">
									<OrbitIcon className="h-8 w-8 text-primary-900 dark:text-primary-100" />

									<div className="text-2xl font-semibold font-display sm:flex gap-2 hidden h-full">
										Page <span className="font-bold">UI</span>
									</div>
								</div>
							)}
						</a>

						{title ? <div className="text-lg font-semibold">{title}</div> : null}

						{description ? <p className="text-sm opacity-70">{description}</p> : null}
					</div>

					<div
						className={cn(
							"md:grid-cols-2 gap-12 mt-6 md:mt-0 grid items-start",
							columnNumber === 3 ? "md:grid-cols-3" : "",
							columnNumber === 4 ? "lg:grid-cols-4" : "",
						)}
					>
						{children}
					</div>
				</div>
			</div>

			{footnote ? (
				<div>
					<hr
						className="my-4 from-white/5 via-black/10 to-white/5 dark:from-black/5 dark:via-white/30 darK:to-black/5 w-full border-0 bg-gradient-to-r"
						style={{ height: "1px" }}
					/>

					<div className="py-8 px-2 flex flex-col items-center">
						<div className="lg:flex lg:justify-center p-4 mb-2 space-x-2 text-sm text-gray-500 dark:text-gray-400 w-full text-center">
							{footnote}
						</div>
					</div>
				</div>
			) : null}
		</footer>
	);
};
