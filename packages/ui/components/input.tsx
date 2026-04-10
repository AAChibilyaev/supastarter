import React from "react";

import { cn } from "../lib";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = ({ className, type, ...props }: InputProps) => {
	return (
		<input
			type={type}
			className={cn(
				"h-9 shadow-xs px-3 py-1 text-base file:font-medium file:text-sm flex w-full rounded-md border border-input bg-card transition-colors file:border-0 file:bg-transparent placeholder:text-foreground/60 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
};

export { Input };
