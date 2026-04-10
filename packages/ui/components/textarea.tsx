import * as React from "react";

import { cn } from "../lib";

const Textarea = ({ className, ...props }: React.ComponentProps<"textarea">) => {
	return (
		<textarea
			className={cn(
				"shadow-xs px-3 py-2 text-base md:text-sm flex min-h-[80px] w-full rounded-md border border-input bg-card placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
};

export { Textarea };
