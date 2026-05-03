"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { cn } from "@repo/ui";
import {
	BarChart3Icon,
	HomeIcon,
	MenuIcon,
	SearchIcon,
	SettingsIcon,
	StarIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface BottomNavItem {
	label: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	isActive: boolean;
}

export function MobileBottomNav() {
	const t = useTranslations();
	const pathname = usePathname();
	const { activeOrganization } = useActiveOrganization();

	const basePath = activeOrganization ? `/${activeOrganization.slug}` : "";

	const items: BottomNavItem[] = useMemo(() => {
		const navItems: BottomNavItem[] = [
			{
				label: t("search.nav.overview"),
				href: `${basePath}/overview`,
				icon: HomeIcon,
				isActive:
					pathname === `${basePath}/overview` ||
					pathname === basePath ||
					pathname === `/${activeOrganization?.slug}`,
			},
			{
				label: t("search.nav.search"),
				href: `${basePath}/search`,
				icon: SearchIcon,
				isActive:
					pathname.startsWith(`${basePath}/search`) ||
					pathname.startsWith(`${basePath}/api-keys`) ||
					pathname.startsWith(`${basePath}/import-jobs`) ||
					pathname.startsWith(`${basePath}/jobs`) ||
					pathname.startsWith(`${basePath}/preview`),
			},
			{
				label: t("search.nav.analytics"),
				href: `${basePath}/analytics`,
				icon: BarChart3Icon,
				isActive: pathname.startsWith(`${basePath}/analytics`),
			},
			{
				label: t("app.menu.mySearch"),
				href: "/my-search",
				icon: StarIcon,
				isActive: pathname === "/my-search" || pathname.startsWith("/my-search/"),
			},
			{
				label: t("settings.title"),
				href: `${basePath}/settings/general`,
				icon: SettingsIcon,
				isActive: pathname.startsWith(`${basePath}/settings`),
			},
		];

		// If no org, show settings under root
		if (!activeOrganization) {
			navItems[navItems.length - 1] = {
				label: t("settings.title"),
				href: "/settings/general",
				icon: SettingsIcon,
				isActive: pathname.startsWith("/settings"),
			};
		}

		return navItems;
	}, [t, pathname, basePath, activeOrganization]);

	return (
		<nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-bottom">
			<div className="flex items-center justify-around h-16 px-2">
				{items.map((item) => (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full rounded-md transition-colors",
							item.isActive
								? "text-primary"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<item.icon
							className={cn(
								"size-5",
								item.isActive && "stroke-[2.5]",
							)}
						/>
						<span
							className={cn(
								"text-[10px] font-medium leading-tight truncate max-w-full px-1",
								item.isActive ? "text-primary" : "text-muted-foreground",
							)}
						>
							{item.label}
						</span>
					</Link>
				))}

				{/* Sidebar trigger for mobile */}
				<MobileSidebarTrigger />
			</div>
		</nav>
	);
}

function MobileSidebarTrigger() {
	const pathname = usePathname();

	return (
		<Link
			href={`${pathname}?sidebar=true`}
			className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full rounded-md text-muted-foreground hover:text-foreground transition-colors"
			aria-label="Open menu"
		>
			<MenuIcon className="size-5" />
			<span className="text-[10px] font-medium leading-tight truncate max-w-full px-1">
				Menu
			</span>
		</Link>
	);
}
