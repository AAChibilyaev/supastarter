"use client";

import { cn } from "@repo/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import type { ReactNode } from "react";

interface DashboardCardProps {
	title: string;
	value: string | number;
	description?: string;
	icon?: ReactNode;
	trend?: { value: number; label: string };
	className?: string;
	children?: ReactNode;
}

export function DashboardCard({
	title,
	value,
	description,
	icon,
	trend,
	className,
	children,
}: DashboardCardProps) {
	return (
		<Card className={cn("hover:shadow-md transition-shadow", className)}>
			<CardHeader className="pb-2 flex flex-row items-center justify-between">
				<CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
				{icon && (
					<div className="size-8 flex items-center justify-center rounded-lg bg-muted text-muted-foreground">
						{icon}
					</div>
				)}
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				{(description || trend) && (
					<div className="mt-1 gap-2 text-xs flex items-center text-muted-foreground">
						{trend && (
							<span
								className={cn(
									"font-medium",
									trend.value > 0
										? "text-green-500"
										: trend.value < 0
											? "text-destructive"
											: "text-muted-foreground",
								)}
							>
								{trend.value > 0 ? "+" : ""}
								{trend.value}% {trend.label}
							</span>
						)}
						{description && <span>{description}</span>}
					</div>
				)}
				{children && <div className="mt-4">{children}</div>}
			</CardContent>
		</Card>
	);
}
