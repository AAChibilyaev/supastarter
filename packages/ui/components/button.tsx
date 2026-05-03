import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "../lib";
import { Spinner } from "./spinner";

const buttonVariants = cva(
	"flex items-center justify-center font-semibold enabled:cursor-pointer transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&>svg]:mr-1.5 [&>svg+svg]:hidden",
	{
		variants: {
			variant: {
				primary: "bg-primary text-primary-foreground hover:bg-primary/80",
				secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
				outline: "border bg-transparent text-secondary hover:bg-secondary/10",
				ghost: "text-foreground hover:bg-foreground/10 hover:text-foreground",
				destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
				link: "text-primary underline-offset-4 hover:underline",
				default: "bg-primary text-primary-foreground hover:bg-primary/80",
			},
			size: {
				sm: "min-h-11 rounded-md px-3 text-xs",
				md: "min-h-11 rounded-md px-4 text-sm",
				lg: "h-12 rounded-md px-6 text-base",
				icon: "min-h-11 min-w-11 rounded-md [&>svg]:m-0",
				default: "min-h-11 rounded-md px-4 text-sm",
			},
		},
		defaultVariants: {
			variant: "secondary",
			size: "md",
		},
	},
);

export type ButtonProps = {
	asChild?: boolean;
	loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

const Button = ({
	className,
	children,
	variant,
	size,
	asChild = false,
	loading,
	disabled,
	...props
}: ButtonProps) => {
	const Comp = asChild ? SlotPrimitive.Slot : "button";
	return (
		<Comp
			className={cn(buttonVariants({ variant, size, className }))}
			disabled={disabled || loading}
			{...props}
		>
			{loading && <Spinner className="mr-1.5 size-4 text-inherit" />}
			<SlotPrimitive.Slottable>{children}</SlotPrimitive.Slottable>
		</Comp>
	);
};

export { Button, buttonVariants };
