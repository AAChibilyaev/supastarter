"use client";

import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "../lib";
import { buttonVariants } from "./button";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = ({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) => (
	<AlertDialogPrimitive.Overlay
		className={cn(
			"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 inset-0 bg-black/80 data-[state=closed]:animate-out data-[state=open]:animate-in fixed z-50",
			className,
		)}
		{...props}
	/>
);

const AlertDialogContent = ({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) => (
	<AlertDialogPortal>
		<AlertDialogOverlay />
		<AlertDialogPrimitive.Content
			className={cn(
				"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] max-w-lg gap-4 p-6 shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in sm:rounded-lg fixed top-[50%] left-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] border bg-background duration-200",
				className,
			)}
			{...props}
		/>
	</AlertDialogPortal>
);

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("space-y-2 sm:text-left flex flex-col text-center", className)} {...props} />
);

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("sm:flex-row sm:justify-end sm:space-x-2 flex flex-col-reverse", className)}
		{...props}
	/>
);

const AlertDialogTitle = ({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) => (
	<AlertDialogPrimitive.Title className={cn("font-semibold text-lg", className)} {...props} />
);

const AlertDialogDescription = ({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) => (
	<AlertDialogPrimitive.Description
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
);

const AlertDialogAction = ({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) => (
	<AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />
);

const AlertDialogCancel = ({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) => (
	<AlertDialogPrimitive.Cancel
		className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
		{...props}
	/>
);

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogOverlay,
	AlertDialogPortal,
	AlertDialogTitle,
	AlertDialogTrigger,
};
