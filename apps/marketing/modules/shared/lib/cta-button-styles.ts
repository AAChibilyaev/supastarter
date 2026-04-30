import { cn } from "@repo/ui";

export function marketingCtaButtonClassName(primary: boolean) {
	return cn(
		"transition-all duration-200",
		primary
			? "shadow-lg border border-primary/20 shadow-primary/15 hover:bg-primary/90 dark:border-primary/30 dark:shadow-primary/10"
			: "border-border/80 bg-background/80 text-foreground hover:bg-muted hover:text-foreground dark:border-border dark:bg-card/80 dark:hover:bg-muted",
	);
}
