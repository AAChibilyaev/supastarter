"use client";

import { cn } from "../../lib";
import { GlowBg } from "../GlowBg";
import { LandingNewsletterInput } from "./LandingNewsletterInput";

/**
 * A component meant to be used in the landing page.
 * It shows a newsletter input form with a title, description.
 */
export const LandingNewsletterSection = ({
	children,
	className,
	innerClassName,
	title,
	titleComponent,
	description,
	descriptionComponent,
	buttonLabel = "Subscribe",
	placeholderLabel = "Enter your email",
	inputLabel = "Email address",
	textPosition = "center",
	minHeight = 350,
	withBackground = false,
	withBackgroundGlow = false,
	withAvatars = false,
	variant = "primary",
	backgroundGlowVariant = "primary",
	disabled = false,
	onSubmit = () => {},
}: {
	children?: React.ReactNode;
	className?: string;
	innerClassName?: string;
	title?: string | React.ReactNode;
	titleComponent?: React.ReactNode;
	description?: string | React.ReactNode;
	descriptionComponent?: React.ReactNode;
	buttonLabel?: string;
	placeholderLabel?: string;
	inputLabel?: string;
	textPosition?: "center" | "left";
	minHeight?: number;
	withBackground?: boolean;
	withBackgroundGlow?: boolean;
	withAvatars?: boolean;
	variant?: "primary" | "secondary";
	backgroundGlowVariant?: "primary" | "secondary";
	disabled?: boolean;
	onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}) => {
	return (
		<section
			className={cn(
				"gap-8 py-12 lg:py-16 flex w-full flex-col items-center justify-center",
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
						className={cn("lg:w-1/2 z-0 h-auto w-full opacity-100 dark:opacity-50")}
						variant={backgroundGlowVariant}
					/>
				</div>
			) : null}

			<div
				className={cn(
					"container-wide pt-12 p-6 relative flex w-full flex-col items-center justify-center",
					innerClassName,
				)}
				style={{
					minHeight,
				}}
			>
				<div
					className={cn(
						"gap-4 flex flex-col",
						textPosition === "center"
							? "md:max-w-lg xl:max-w-2xl items-center text-center"
							: "items-start",
					)}
				>
					{withAvatars ? (
						<div className="mb-6 flex">
							<img
								src="/static/images/people/1.webp"
								alt="Person 1"
								width={200}
								height={200}
								className="w-14 h-14 shrink-0 rounded-full"
							/>

							<img
								src="/static/images/people/2.webp"
								alt="Person 2"
								width={200}
								height={200}
								className={cn(
									"w-16 h-16 -ml-6 shrink-0 rotate-12 rounded-full",
									variant === "primary" ? "border-2 border-primary-500" : "",
									variant === "secondary" ? "border-secondary-500 border-2" : "",
								)}
							/>

							<img
								src="/static/images/people/3.webp"
								alt="Person 3"
								width={200}
								height={200}
								className={cn(
									"w-20 h-20 -ml-4 relative z-10 shrink-0 rounded-full",
									variant === "primary" ? "border-2 border-primary-500" : "",
									variant === "secondary" ? "border-secondary-500 border-2" : "",
								)}
							/>

							<img
								src="/static/images/people/4.webp"
								alt="Person 4"
								width={200}
								height={200}
								className={cn(
									"w-16 h-16 -ml-4 shrink-0 -rotate-12 rounded-full",
									variant === "primary" ? "border-2 border-primary-500" : "",
									variant === "secondary" ? "border-secondary-500 border-2" : "",
								)}
							/>

							<img
								src="/static/images/people/5.webp"
								alt="Person 5"
								width={200}
								height={200}
								className="w-14 h-14 -ml-4 shrink-0 rounded-full"
							/>
						</div>
					) : null}

					{titleComponent ||
						(title && (
							<h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight">
								{title}
							</h2>
						))}

					{descriptionComponent ||
						(description && <p className="md:text-lg -mt-3">{description}</p>)}

					<LandingNewsletterInput
						className="mt-4 max-w-sm"
						onSubmit={onSubmit}
						buttonLabel={buttonLabel}
						placeholderLabel={placeholderLabel}
						inputLabel={inputLabel}
						disabled={disabled}
					/>

					{children}
				</div>
			</div>
		</section>
	);
};
