import { cn } from "@repo/ui";

interface ResultCardProps {
	title: string;
	titleHighlight?: string;
	description?: string;
	category?: string;
	score?: number;
	className?: string;
}

export function ResultCard({
	title,
	titleHighlight,
	description,
	category,
	score,
	className,
}: ResultCardProps) {
	const renderTitle = () => {
		if (!titleHighlight) return <span>{title}</span>;
		const idx = title.toLowerCase().indexOf(titleHighlight.toLowerCase());
		if (idx === -1) return <span>{title}</span>;
		return (
			<>
				{title.slice(0, idx)}
				<mark className="rounded px-0.5 bg-primary/15 text-primary not-italic">
					{title.slice(idx, idx + titleHighlight.length)}
				</mark>
				{title.slice(idx + titleHighlight.length)}
			</>
		);
	};

	return (
		<div className={cn("px-4 py-3 rounded-lg border border-border bg-muted/30", className)}>
			<div className="gap-2 flex items-start justify-between">
				<p className="text-sm font-medium text-foreground">{renderTitle()}</p>
				{score !== undefined && (
					<span className="rounded px-1.5 py-0.5 font-mono shrink-0 bg-muted text-[10px] text-muted-foreground">
						{score.toFixed(2)}
					</span>
				)}
			</div>
			{description && (
				<p className="mt-1 text-xs leading-relaxed line-clamp-2 text-muted-foreground">
					{description}
				</p>
			)}
			{category && (
				<span className="mt-2 px-2 py-0.5 inline-block rounded-full bg-muted text-[10px] text-muted-foreground">
					{category}
				</span>
			)}
		</div>
	);
}
