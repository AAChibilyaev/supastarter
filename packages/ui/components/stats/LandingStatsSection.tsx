import { cn } from "../../lib";
import { GlowBg } from "../GlowBg";
import { LandingStatItem } from "./LandingStatItem";

/**
 * A component that displays a grid of statistics.
 * Can be configured to show preset stats or custom stats.
 */
export function LandingStatsSection({
	className,
	innerClassName,
	title,
	titleComponent,
	description,
	descriptionComponent,
	stats,
	variant = "default",
	withBackground = false,
	withBackgroundGlow = false,
	backgroundGlowVariant = "primary",
	columnsDesktop = 3,
	columnsMobile = 1,
	hasBorders = true,
	textPosition = "center",
	children,
}: {
	className?: string;
	innerClassName?: string;
	title?: string;
	titleComponent?: React.ReactNode;
	description?: string | React.ReactNode;
	descriptionComponent?: React.ReactNode;
	stats?: Array<{ value: string; label?: string; description: string }>;
	variant?: "primary" | "secondary" | "default";
	withBackground?: boolean;
	withBackgroundGlow?: boolean;
	backgroundGlowVariant?: "primary" | "secondary";
	columnsDesktop?: 2 | 3 | 4;
	columnsMobile?: 1 | 2;
	hasBorders?: boolean;
	textPosition?: "center" | "left";
	children?: React.ReactNode;
}) {
	return (
		<section
			className={cn(
				"py-12 lg:py-16 flex w-full flex-col items-center justify-center",
				withBackground && variant === "primary"
					? "bg-primary-100/20 dark:bg-primary-900/10"
					: "",
				withBackground && variant === "secondary"
					? "bg-secondary-100/20 dark:bg-secondary-900/10"
					: "",
				withBackgroundGlow ? "relative overflow-hidden" : "",
				className,
			)}
		>
			{withBackgroundGlow ? (
				<div className="lg:flex pointer-events-none absolute -bottom-3/4 hidden h-full w-full justify-center">
					<GlowBg
						className={cn("lg:w-3/4 z-0 h-auto w-full opacity-100 dark:opacity-50")}
						variant={backgroundGlowVariant}
					/>
				</div>
			) : null}

			<div
				className={cn(
					"container-wide px-6 relative flex w-full flex-col",
					textPosition === "center" ? "items-center" : "items-start",
					innerClassName,
				)}
			>
				{(title || titleComponent) && (
					<div
						className={cn(
							"gap-4 mb-12 p-6 flex flex-col",
							textPosition === "center"
								? "max-w-xl items-center text-center"
								: "items-start",
						)}
					>
						{titleComponent ||
							(title && (
								<h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight">
									{title}
								</h2>
							))}

						{descriptionComponent ||
							(description && (
								<p className="text-base md:text-lg text-gray-700 dark:text-gray-300">
									{description}
								</p>
							))}
					</div>
				)}

				{stats ? (
					<div
						className={cn(
							"gap-4 grid w-full",
							columnsMobile === 1 ? "grid-cols-1" : "grid-cols-2",
							columnsDesktop === 2 ? "md:grid-cols-2" : "",
							columnsDesktop === 3 ? "md:grid-cols-3" : "",
							columnsDesktop === 4 ? "md:grid-cols-4" : "",
						)}
					>
						{stats.map((stat, index) => {
							return (
								<LandingStatItem
									key={index}
									value={stat.value}
									label={stat.label}
									description={stat.description}
									variant={variant}
									hasBorder={hasBorders}
								/>
							);
						})}
					</div>
				) : (
					<div
						className={cn(
							"gap-4 grid w-full",
							columnsMobile === 1 ? "grid-cols-1" : "grid-cols-2",
							columnsDesktop === 2 ? "md:grid-cols-2" : "",
							columnsDesktop === 3 ? "md:grid-cols-3" : "",
							columnsDesktop === 4 ? "md:grid-cols-4" : "",
						)}
					>
						{children}
					</div>
				)}
			</div>
		</section>
	);
}
