import { cn } from "../lib";
import { buttonVariants } from "./button";
import { GlowBg } from "./GlowBg";

/**
 * A component meant to be used in the landing page.
 *
 * A simple section that shows a selling point and call to action button.
 */
export const LandingSaleCtaSection = ({
	children,
	className,
	title,
	titleComponent,
	description,
	descriptionComponent,
	footerComponent,
	ctaHref = "#",
	ctaLabel,
	secondaryCtaHref = "#",
	secondaryCtaLabel,
	withBackground = false,
	withBackgroundGlow = false,
	variant = "primary",
	backgroundGlowVariant = "primary",
}: {
	children?: React.ReactNode;
	className?: string;
	title?: string | React.ReactNode;
	titleComponent?: React.ReactNode;
	description?: string | React.ReactNode;
	descriptionComponent?: React.ReactNode;
	footerComponent?: React.ReactNode;
	ctaHref?: string;
	ctaLabel?: string;
	secondaryCtaHref?: string;
	secondaryCtaLabel?: string;
	withBackground?: boolean;
	withBackgroundGlow?: boolean;
	variant?: "primary" | "secondary";
	backgroundGlowVariant?: "primary" | "secondary";
}) => {
	return (
		<section
			className={cn(
				"gap-8 py-12 lg:py-16 relative flex w-full flex-col items-center justify-center",
				withBackground && variant === "primary" ? "bg-primary-100/20 dark:bg-primary-900/10" : "",
				withBackground && variant === "secondary"
					? "bg-secondary-100/20 dark:bg-secondary-900/10"
					: "",
				withBackgroundGlow ? "relative overflow-hidden" : "",
				className,
			)}
		>
			{withBackgroundGlow ? (
				<div className="lg:flex pointer-events-none absolute -bottom-1/2 hidden h-full w-full justify-center">
					<GlowBg className={cn("lg:w-2/3 z-0 h-auto w-full")} variant={backgroundGlowVariant} />
				</div>
			) : null}

			<div className={cn(className, "p-6 container-narrow w-full")}>
				{titleComponent ||
					(title && (
						<h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight max-w-xs sm:max-w-none fancyHeading">
							{title}
						</h2>
					))}

				{descriptionComponent || (description && <p className="mt-6 md:text-xl">{description}</p>)}

				<div className="mt-6 gap-4 flex w-full flex-wrap items-center">
					{ctaLabel ? (
						<a
							href={ctaHref}
							target="_blank"
							rel="noopener noreferrer"
							className={cn(
								buttonVariants({
									variant: variant === "primary" ? "primary" : "secondary",
									size: "lg",
								}),
								"shrink-0",
							)}
						>
							{ctaLabel}
						</a>
					) : null}

					{secondaryCtaLabel ? (
						<a
							href={secondaryCtaHref}
							target="_blank"
							rel="noopener noreferrer"
							className={cn(
								buttonVariants({
									variant: "outline",
									size: "lg",
								}),
								"shrink-0",
							)}
						>
							{secondaryCtaLabel}
						</a>
					) : null}

					{children}
				</div>

				{footerComponent}
			</div>
		</section>
	);
};
