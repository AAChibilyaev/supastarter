import { cn } from "../lib";
import { GlowBg } from "./GlowBg";

export interface FaqQuestionItem {
	question: string;
	answer: string;
}

/**
 * A component meant to be used in the landing page.
 * It displays a list of frequently asked questions and their answers.
 */
export const LandingFaqSection = ({
	className,
	title,
	titleComponent,
	description,
	descriptionComponent,
	faqItems,
	withBackground = false,
	withBackgroundGlow = false,
	variant = "primary",
	backgroundGlowVariant = "primary",
}: {
	className?: string;
	title?: string | React.ReactNode;
	titleComponent?: React.ReactNode;
	description?: string | React.ReactNode;
	descriptionComponent?: React.ReactNode;
	faqItems: FaqQuestionItem[];
	withBackground?: boolean;
	withBackgroundGlow?: boolean;
	variant?: "primary" | "secondary";
	backgroundGlowVariant?: "primary" | "secondary";
}) => {
	return (
		<section
			className={cn(
				"gap-8 py-12 lg:py-16 relative flex w-full flex-col items-center justify-center",
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
				<div className="lg:flex pointer-events-none absolute -bottom-1/2 hidden h-full w-full justify-center">
					<GlowBg
						className={cn("lg:w-2/3 z-0 h-auto w-full")}
						variant={backgroundGlowVariant}
					/>
				</div>
			) : null}

			<div className={cn(className, "p-6 container-wide w-full max-w-full")}>
				{titleComponent ||
					(title && (
						<h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight max-w-xs sm:max-w-none fancyHeading">
							{title}
						</h2>
					))}

				{descriptionComponent ||
					(description && <p className="mt-6 md:text-xl">{description}</p>)}

				<ul
					className={cn(
						"md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 mt-12 lg:mt-16 faq grid",
						className,
					)}
				>
					{faqItems.map((faqItem, index) => (
						<li key={index}>
							<h3>{faqItem.question}</h3>
							<p>{faqItem.answer}</p>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
};
