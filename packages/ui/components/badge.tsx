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

export type BadgeProps = React.HtmlHTMLAttributes<HTMLDivElement> & VariantProps<typeof badge>;

export const Badge = ({ children, className, status, ...props }: BadgeProps) => (
	<span className={cn(badge({ status }), className)} {...props}>
		{children}
	</span>
);

Badge.displayName = "Badge";
