"use client";

import { cn } from "@repo/ui";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { CheckCircle2Icon, ClockIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import type { ReactNode } from "react";

// ── Types ───────────────────────────────────────────────────────

export interface KanbanItem {
	id: string;
	title: string;
	description?: string;
	badge?: { label: string; status?: "success" | "info" | "warning" | "error" };
	meta?: string;
}

export interface KanbanColumn {
	id: string;
	title: string;
	icon?: ReactNode;
	items: KanbanItem[];
	emptyMessage?: string;
}

interface KanbanBoardProps {
	columns: KanbanColumn[];
	className?: string;
	onItemClick?: (itemId: string) => void;
}

// ── Status icons ────────────────────────────────────────────────

const STATUS_ICONS: Record<string, ReactNode> = {
	pending: <ClockIcon className="size-4 text-muted-foreground" />,
	processing: <Loader2Icon className="size-4 animate-spin text-blue-500" />,
	completed: <CheckCircle2Icon className="size-4 text-green-500" />,
	failed: <XCircleIcon className="size-4 text-destructive" />,
};

// ── Component ───────────────────────────────────────────────────

export function KanbanBoard({ columns, className, onItemClick }: KanbanBoardProps) {
	return (
		<div
			className={cn(
				"gap-4 grid",
				columns.length <= 2
					? "md:grid-cols-2 grid-cols-1"
					: columns.length === 3
						? "md:grid-cols-3 grid-cols-1"
						: "md:grid-cols-2 lg:grid-cols-4 grid-cols-1",
				className,
			)}
		>
			{columns.map((col) => (
				<Card key={col.id} className="flex flex-col">
					<CardHeader className="pb-2">
						<CardTitle className="gap-2 text-sm font-medium flex items-center">
							{col.icon ?? STATUS_ICONS[col.id] ?? null}
							{col.title}
							<Badge status="info" className="ml-auto">
								{col.items.length}
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 flex-1">
						{col.items.length === 0 ? (
							<p className="py-8 text-sm text-center text-muted-foreground">
								{col.emptyMessage ?? "No items"}
							</p>
						) : (
							col.items.map((item) => (
								<button
									type="button"
									key={item.id}
									className={cn(
										"p-3 w-full rounded-lg border bg-card text-left transition-colors hover:bg-muted/50",
										onItemClick && "cursor-pointer",
									)}
									onClick={() => onItemClick?.(item.id)}
								>
									<div className="gap-2 flex items-start justify-between">
										<span className="text-sm font-medium leading-tight">{item.title}</span>
										{item.badge && (
											<Badge status={item.badge.status ?? "info"} className="shrink-0 text-[10px]">
												{item.badge.label}
											</Badge>
										)}
									</div>
									{item.description && (
										<p className="mt-1 text-xs line-clamp-2 text-muted-foreground">
											{item.description}
										</p>
									)}
									{item.meta && (
										<span className="mt-2 block text-[10px] text-muted-foreground">
											{item.meta}
										</span>
									)}
								</button>
							))
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}
