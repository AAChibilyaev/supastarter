import type { ComponentType, ReactNode } from "react";

interface FeatureCardHeaderRowProps {
	icon: ComponentType<{ className?: string }>;
	children: ReactNode;
}

export function FeatureCardHeaderRow({ icon: Icon, children }: FeatureCardHeaderRowProps) {
	return (
		<div className="flex flex-row items-center gap-4 p-6 pb-4">
			<div className="size-10 shrink-0 flex items-center justify-center rounded-lg border border-border/60 bg-muted/50 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5">
				<Icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
			</div>
			<div className="min-w-0 flex-1 [&_h3]:leading-snug">{children}</div>
		</div>
	);
}
