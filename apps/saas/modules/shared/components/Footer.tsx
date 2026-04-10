import { cn } from "@repo/ui";

export function Footer() {
	return (
		<footer className={cn("max-w-6xl py-6 text-xs container text-center text-foreground/60")}>
			<span>
				<a href="https://supastarter.dev">Built with supastarter</a>
			</span>
		</footer>
	);
}
