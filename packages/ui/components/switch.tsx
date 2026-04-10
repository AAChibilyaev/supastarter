"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "../lib";

const Switch = ({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) => (
	<SwitchPrimitive.Root
		className={cn(
			"peer h-6 w-11 inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
			className,
		)}
		{...props}
	>
		<SwitchPrimitive.Thumb
			className={cn(
				"size-5 shadow-lg data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 pointer-events-none block rounded-full bg-background ring-0 transition-transform",
			)}
		/>
	</SwitchPrimitive.Root>
);

Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
