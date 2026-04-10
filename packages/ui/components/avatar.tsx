"use client";

import { Avatar as AvatarPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "../lib";

const Avatar = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) => (
	<AvatarPrimitive.Root
		className={cn("h-8 w-8 relative flex shrink-0 overflow-hidden rounded-sm", className)}
		{...props}
	/>
);

const AvatarImage = ({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) => (
	<AvatarPrimitive.Image
		className={cn("aspect-square h-full w-full rounded-sm", className)}
		{...props}
	/>
);

const AvatarFallback = ({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) => (
	<AvatarPrimitive.Fallback
		className={cn(
			"font-bold text-xs flex h-full w-full items-center justify-center rounded-sm bg-muted",
			className,
		)}
		{...props}
	/>
);

export { Avatar, AvatarFallback, AvatarImage };
