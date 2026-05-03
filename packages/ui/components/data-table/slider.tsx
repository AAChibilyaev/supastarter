"use client";

// Props to https://github.com/shadcn-ui/ui/issues/885#issuecomment-2059600641

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "../../lib";

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
	const initialValue = Array.isArray(props.value) ? props.value : [props.min, props.max];

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			className={cn("relative flex w-full touch-none items-center select-none", className)}
			{...props}
		>
			<SliderPrimitive.Track className="h-2 relative w-full grow overflow-hidden rounded-full bg-secondary">
				<SliderPrimitive.Range className="absolute h-full bg-primary" />
			</SliderPrimitive.Track>
			{initialValue.map((_, index) => (
				<React.Fragment key={index}>
					<SliderPrimitive.Thumb className="h-4 w-4 block rounded-full border-2 border-primary bg-background transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50" />
				</React.Fragment>
			))}
		</SliderPrimitive.Root>
	);
}

export { Slider };
