import { cn } from "@repo/ui";

export function marketingCtaButtonClassName(primary: boolean) {
	return cn(
		"transition-colors duration-200",
		primary ? "hover:bg-primary/90" : "border-border text-foreground hover:bg-muted",
	);
}
