import { cn } from "@repo/ui";
import type { ReactNode } from "react";

interface VisualFrameProps {
	children: ReactNode;
	className?: string;
}

export function VisualFrame({ children, className }: VisualFrameProps) {
	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-xl border border-border bg-card",
				className,
			)}
		>
			{children}
		</div>
	);
}
