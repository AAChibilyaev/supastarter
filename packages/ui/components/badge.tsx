import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type React from "react";

import { cn } from "../lib";

export const badge = cva(
	[
		"inline-block",
		"rounded-full",
		"px-3",
		"py-1",
		"text-xs",
		"uppercase",
		"font-semibold",
		"leading-tight",
	],
	{
		variants: {
			status: {
				success: ["bg-success/10", "text-success"],
				info: ["bg-primary/10", "text-primary"],
				warning: ["bg-warning/10", "text-warning"],
				error: ["bg-destructive/10", "text-destructive"],
			},
		},
		defaultVariants: {
			status: "info",
		},
	},
);

export type BadgeProps = React.HtmlHTMLAttributes<HTMLDivElement> &
	VariantProps<typeof badge> & {
		variant?: "default" | "secondary" | "outline" | "destructive";
	};

export const Badge = ({ children, className, status, variant, ...props }: BadgeProps) => {
	// Map variant to status for shadcn-admin-kit compatibility
	let resolvedStatus = status;
	if (!resolvedStatus && variant) {
		resolvedStatus =
			variant === "default"
				? "info"
				: variant === "destructive"
					? "error"
					: variant === "secondary"
						? "info"
						: "info";
	}
	return (
		<span className={cn(badge({ status: resolvedStatus }), className)} {...props}>
			{children}
		</span>
	);
};

Badge.displayName = "Badge";
