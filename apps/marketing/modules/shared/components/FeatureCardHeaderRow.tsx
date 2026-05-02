import type { ComponentType, ReactNode } from "react";

interface FeatureCardHeaderRowProps {
	icon: ComponentType<{ className?: string }>;
	children: ReactNode;
}

export function FeatureCardHeaderRow({ icon: Icon, children }: FeatureCardHeaderRowProps) {
	return (
		<div className="gap-4 p-6 pb-4 flex flex-row items-center">
			<div className="size-10 flex shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5">
				<Icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
			</div>
			<div className="min-w-0 [&_h3]:leading-snug flex-1">{children}</div>
		</div>
	);
}
