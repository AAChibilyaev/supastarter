"use client";

import * as React from "react";

import { cn } from "../lib";

/** Styled stepper primitives; use `@stepperize/react` + `@stepperize/react/primitives` for `defineStepper` / hooks. */

/**
 * Step wrapper — a single step definition for use with `defineStepper`.
 */
export interface Step {
	id: string;
	label?: string;
	description?: string;
}

/**
 * Stepper.Root — wraps the entire stepper with orientation support.
 */
const StepperRoot = ({
	className,
	orientation = "vertical",
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	orientation?: "horizontal" | "vertical";
}) => (
	<div
		className={cn(
			"flex",
			orientation === "horizontal" ? "flex-row items-start" : "flex-col",
			className,
		)}
		{...props}
	/>
);

/**
 * Stepper.List — the ordered list of step indicators.
 */
const StepperList = ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
	<ol className={cn("gap-2 flex flex-col", className)} {...props} />
);

/**
 * Stepper.Item — a single step indicator item.
 */
const StepperItem = ({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => (
	<li className={cn("gap-3 flex items-start", className)} {...props} />
);

/**
 * Stepper.Separator — visual connector between step indicators.
 */
const StepperSeparator = ({
	className,
	orientation = "vertical",
	...props
}: React.HTMLAttributes<HTMLHRElement> & {
	orientation?: "horizontal" | "vertical";
}) => (
	<hr
		className={cn(
			orientation === "horizontal" ? "h-px w-full" : "h-8 ml-[13px] w-px",
			"shrink-0 border-border",
			className,
		)}
		{...props}
	/>
);

/**
 * Stepper.Indicator — the visual indicator (dot/number) for a step.
 */
const StepperIndicator = ({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
	<span
		className={cn(
			"size-7 relative flex shrink-0 items-center justify-center rounded-full border",
			"data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground",
			"data-[status=success]:border-emerald-500 data-[status=success]:bg-emerald-500 data-[status=success]:text-white",
			"data-[status=inactive]:border-muted-foreground/30 data-[status=inactive]:text-muted-foreground",
			className,
		)}
		{...props}
	>
		{children}
	</span>
);

/**
 * Stepper.Title — the title text of a step.
 */
const StepperTitle = ({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
	<h4
		className={cn(
			"text-sm font-medium leading-tight",
			"data-[status=active]:text-foreground",
			"data-[status=success]:text-emerald-600",
			"data-[status=inactive]:text-muted-foreground",
			className,
		)}
		{...props}
	>
		{children}
	</h4>
);

/**
 * Stepper.Description — the description text of a step.
 */
const StepperDescription = ({
	className,
	...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
	<p className={cn("text-xs text-muted-foreground", className)} {...props} />
);

/**
 * Stepper.Content — renders the content panel for a specific step.
 */
const StepperContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("pt-2", className)} {...props} />
);

/**
 * Stepper.Actions — container for prev/next navigation buttons.
 */
const StepperActions = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("gap-2 pt-4 flex items-center", className)} {...props} />
);

/**
 * Stepper — composite component for step-by-step workflows.
 */
const Stepper = {
	Root: StepperRoot,
	List: StepperList,
	Item: StepperItem,
	Separator: StepperSeparator,
	Indicator: StepperIndicator,
	Title: StepperTitle,
	Description: StepperDescription,
	Content: StepperContent,
	Actions: StepperActions,
};

export { Stepper };
