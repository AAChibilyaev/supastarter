"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { InboxIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
	title: string;
	description: string;
	action?: {
		label: string;
		href: string;
	};
	icon?: LucideIcon;
}

export function EmptyState({ title, description, action, icon: Icon }: EmptyStateProps) {
	const IconComponent = Icon ?? InboxIcon;

	return (
		<Card className="p-12 flex flex-col items-center justify-center text-center">
			<IconComponent className="mb-4 size-12 text-muted-foreground/40" />
			<h3 className="mb-1 text-lg font-semibold">{title}</h3>
			<p className="mb-6 max-w-md text-sm text-muted-foreground">{description}</p>
			{action && (
				<Button asChild variant="primary">
					<Link href={action.href}>{action.label}</Link>
				</Button>
			)}
		</Card>
	);
}
