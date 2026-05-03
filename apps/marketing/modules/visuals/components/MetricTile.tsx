import { cn } from "@repo/ui";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

interface MetricTileProps {
	label: string;
	value: string;
	delta?: string;
	trend?: "up" | "down";
	className?: string;
}

export function MetricTile({ label, value, delta, trend, className }: MetricTileProps) {
	return (
		<div className={cn("p-4 rounded-lg border border-border bg-muted/30", className)}>
			<p className="font-medium tracking-wide text-[11px] text-muted-foreground uppercase">
				{label}
			</p>
			<p className="mt-2 text-2xl font-light tracking-tight text-foreground">{value}</p>
			{delta && (
				<div className="mt-2 gap-1 px-2 py-0.5 font-medium inline-flex items-center rounded-full bg-muted text-[11px] text-muted-foreground">
					{trend === "up" ? (
						<TrendingUpIcon className="size-3 text-primary" />
					) : (
						<TrendingDownIcon className="size-3 text-muted-foreground" />
					)}
					{delta}
				</div>
			)}
		</div>
	);
}
