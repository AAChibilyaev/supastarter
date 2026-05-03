import { cn } from "../lib";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";
import { GlowBg } from "./GlowBg";

export interface CollapsibleFaqItem {
	question: string;
	answer: string | React.ReactNode;
}

/**
 * A component meant to be used in the landing page.
 * It displays a collapsible list of frequently asked questions and their answers.
 */
export const LandingFaqCollapsibleSection = ({
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
	faqItems: CollapsibleFaqItem[];
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

			<div className={cn(className, "p-6 container-narrow w-full")}>
				{titleComponent ||
					(title && (
						<h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight max-w-xs sm:max-w-none fancyHeading">
							{title}
						</h2>
					))}

				{descriptionComponent ||
					(description && <p className="mt-6 md:text-xl">{description}</p>)}

				<Accordion type="single" collapsible className="mt-12 relative z-10 w-full">
					{faqItems.map((faqItem, index) => (
						<AccordionItem
							key={index}
							value={`item-${index}`}
							className={cn(
								withBackground && variant === "primary"
									? "border-primary-500/10"
									: "",
								withBackground && variant === "secondary"
									? "border-secondary-500/10"
									: "",
							)}
						>
							<AccordionTrigger className="text-left">
								{faqItem.question}
							</AccordionTrigger>
							<AccordionContent>{faqItem.answer}</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
};
