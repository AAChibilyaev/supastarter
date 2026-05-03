"use client";

import { cn } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { InboxIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateAction {
	label: string;
	href?: string;
	onClick?: () => void;
}

interface EmptyStateProps {
	title?: string;
	description: string;
	action?: EmptyStateAction;
	icon?: LucideIcon;
	/** "card" (default) — full Card with icon and title. "inline" — compact bordered row. */
	variant?: "card" | "inline";
	className?: string;
}

export function EmptyState({
	title,
	description,
	action,
	icon: Icon,
	variant = "card",
	className,
}: EmptyStateProps) {
	if (variant === "inline") {
		return (
			<div
				className={cn(
					"py-6 text-sm rounded-md border text-center text-muted-foreground",
					className,
				)}
			>
				{description}
			</div>
		);
	}

	const IconComponent = Icon ?? InboxIcon;

	const actionButton = action && (
		<Button asChild={!!action.href} variant="primary" onClick={action.onClick}>
			{action.href ? <Link href={action.href}>{action.label}</Link> : action.label}
		</Button>
	);

	return (
		<Card className={cn("p-12 flex flex-col items-center justify-center text-center", className)}>
			<IconComponent className="mb-4 size-12 text-muted-foreground/40" />
			{title && <h3 className="mb-1 text-lg font-semibold">{title}</h3>}
			<p className="mb-6 max-w-md text-sm text-muted-foreground">{description}</p>
			{actionButton}
		</Card>
	);
}
