import { cn } from "@repo/ui";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import type { PropsWithChildren, ReactNode } from "react";

export function SettingsItem({
	children,
	title,
	description,
	danger,
}: PropsWithChildren<{
	title: string | ReactNode;
	description?: string | ReactNode;
	danger?: boolean;
}>) {
	return (
		<Card className="@2xl:grid @2xl:grid-cols-[min(100%/3,360px)_auto] @2xl:gap-8 @container">
			<CardHeader>
				<CardTitle className={cn("font-medium text-base", danger && "text-destructive")}>
					{title}
				</CardTitle>
				{description && (
					<CardDescription className="leading-snug text-foreground/60">
						{description}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="@2xl:pt-6">{children}</CardContent>
		</Card>
	);
}
