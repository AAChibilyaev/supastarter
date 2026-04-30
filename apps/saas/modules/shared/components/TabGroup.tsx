"use client";

import { cn } from "@repo/ui";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useMemo } from "react";

export function TabGroup({
	items,
	className,
}: {
	items: { label: string; href: string; segment: string }[];
	className?: string;
}) {
	const selectedSegment = useSelectedLayoutSegment();
	const activeItem = useMemo(() => {
		return items.find((item) => item.segment === selectedSegment);
	}, [items, selectedSegment]);

	return (
		<div className={cn("flex border-b-2", className)}>
			{items.map((item) => (
				<Link
					key={item.href}
					href={item.href}
					className={cn(
						"-mb-0.5 px-6 py-3 block border-b-2",
						item === activeItem ? "font-bold border-primary" : "border-transparent",
					)}
				>
					{item.label}
				</Link>
			))}
		</div>
	);
}
