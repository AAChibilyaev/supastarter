"use client";

import { cn } from "../../lib";
import { Button } from "../button";
import { Input } from "../input";
import { Label } from "../label";

/**
 * A newsletter input and button, used in LandingNewsletterSection, but can also be used as a standalone component in LandingPrimaryCta sections.
 */
export const LandingNewsletterInput = ({
	className,
	buttonLabel = "Subscribe",
	placeholderLabel = "Enter your email",
	inputLabel = "Email address",
	variant = "primary",
	disabled = false,
	onSubmit = () => {},
}: {
	className?: string;
	buttonLabel?: string;
	placeholderLabel?: string;
	inputLabel?: string;
	variant?: "primary" | "secondary";
	disabled?: boolean;
	onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}) => {
	return (
		<form
			className={cn(
				"sm:flex-row gap-4 flex w-full flex-col items-center justify-center",
				className,
			)}
			onSubmit={onSubmit}
		>
			<div className="flex-grow">
				<Label htmlFor="email" className="sr-only">
					{inputLabel}
				</Label>
				<Input
					type="email"
					id="email"
					name="email"
					placeholder={placeholderLabel}
					required
					className="w-full"
					disabled={disabled}
				/>
			</div>

			<Button
				type="submit"
				className="sm:w-auto w-full"
				variant={variant}
				disabled={disabled}
			>
				{buttonLabel}
			</Button>
		</form>
	);
};
