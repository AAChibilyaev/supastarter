"use client";

import { cn } from "@repo/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SettingsMenu({
	menuItems,
	className,
}: {
	menuItems: {
		title: string;
		avatar: ReactNode;
		items: {
			title: string;
			href: string;
			icon?: ReactNode;
		}[];
	}[];
	className?: string;
}) {
	const pathname = usePathname();

	const isActiveMenuItem = (href: string) => pathname.includes(href);

	// Flatten all items from all menu sections into a single array
	const allItems = menuItems.flatMap((item) => item.items);

	return (
		<div className={cn("relative border-b", className)}>
			<nav className="gap-0 flex">
				{allItems.map((item, index) => {
					const isActive = isActiveMenuItem(item.href);
					return (
						<Link
							key={index}
							href={item.href}
							className={cn(
								"px-4 py-2 text-sm relative border-b-2 transition-colors",
								isActive
									? "font-semibold border-primary text-primary"
									: "font-medium border-transparent text-foreground/60",
							)}
						>
							{item.title}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
