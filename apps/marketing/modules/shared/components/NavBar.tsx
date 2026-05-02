"use client";

import { config } from "@config";
import { LocaleLink, useLocalePathname } from "@i18n/routing";
import { cn, Logo } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "@repo/ui/components/navigation-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@repo/ui/components/sheet";
import { ColorModeToggle } from "@shared/components/ColorModeToggle";
import { LocaleSwitch } from "@shared/components/LocaleSwitch";
import { ChevronDown, MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

interface NavItem {
	label: string;
	href: string;
	external?: boolean;
}

interface NavGroup {
	label: string;
	items: NavItem[];
}

export function NavBar() {
	const t = useTranslations();
	const localePathname = useLocalePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [isTop, setIsTop] = useState(true);

	const handleMobileMenuClose = () => {
		setMobileMenuOpen(false);
	};

	const debouncedScrollHandler = useDebounceCallback(
		() => {
			setIsTop(window.scrollY <= 10);
		},
		150,
		{ maxWait: 150 },
	);

	useEffect(() => {
		window.addEventListener("scroll", debouncedScrollHandler);
		debouncedScrollHandler();
		return () => {
			window.removeEventListener("scroll", debouncedScrollHandler);
		};
	}, [debouncedScrollHandler]);

	useEffect(() => {
		handleMobileMenuClose();
	}, [localePathname]);

	const navGroups: NavGroup[] = [
		{
			label: t("common.menu.product"),
			items: [
				{ label: t("common.menu.features"), href: "/features" },
				{ label: t("common.menu.pricing"), href: "/pricing" },
				{ label: t("common.menu.enterprise"), href: "/enterprise" },
				{ label: t("common.menu.roadmap"), href: "/roadmap" },
				{ label: t("common.menu.changelog"), href: "/changelog" },
			],
		},
		{
			label: t("common.menu.solutions"),
			items: [
				{ label: t("common.menu.useCases"), href: "/use-cases" },
				{ label: t("common.menu.integrations"), href: "/integrations" },
				{ label: t("common.menu.customers"), href: "/customers" },
				{ label: t("common.menu.compare"), href: "/compare" },
				{ label: t("common.menu.aiSearch"), href: "/ai-search" },
			],
		},
		{
			label: t("common.menu.resources"),
			items: [
				{ label: t("common.menu.blog"), href: "/blog" },
				...(config.docsUrl
					? [{ label: t("common.menu.docs"), href: config.docsUrl, external: true }]
					: []),
				{ label: t("common.menu.developers"), href: "/developers" },
				{ label: t("common.menu.faq"), href: "/faq" },
				{ label: t("common.menu.glossary"), href: "/glossary" },
				{ label: t("common.menu.openSource"), href: "/open-source" },
			],
		},
		{
			label: t("common.menu.company"),
			items: [
				{ label: t("common.menu.about"), href: "/about" },
				{ label: t("common.menu.security"), href: "/security" },
				{ label: t("common.menu.careers"), href: "/careers" },
				{ label: t("common.menu.partners"), href: "/partners" },
				{ label: t("common.menu.press"), href: "/press" },
			],
		},
	];

	return (
		<nav
			className={cn("top-0 sticky z-50 w-full bg-background transition-shadow duration-200", {
				"border-b": !isTop,
			})}
			data-test="navigation"
		>
			<div className="container">
				<div
					className={cn(
						"gap-6 flex items-center justify-stretch transition-[padding] duration-200",
						!isTop ? "py-4" : "py-6",
					)}
				>
					<div className="flex flex-1 justify-start">
						<LocaleLink href="/" className="block hover:no-underline active:no-underline">
							<Logo />
						</LocaleLink>
					</div>

					{/* Desktop navigation with dropdowns */}
					<div className="lg:flex hidden flex-1 items-center justify-center">
						<NavigationMenu>
							<NavigationMenuList>
								{navGroups.map((group) => (
									<NavigationMenuItem key={group.label}>
										<NavigationMenuTrigger className="bg-transparent text-sm font-medium text-foreground/80 hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent">
											{group.label}
										</NavigationMenuTrigger>
										<NavigationMenuContent>
											<ul className="grid w-48 gap-0.5 p-2">
												{group.items.map((item) =>
													item.external ? (
														<li key={item.href}>
															<a
																href={item.href}
																target="_blank"
																rel="noopener noreferrer"
																className="block rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
															>
																{item.label}
															</a>
														</li>
													) : (
														<li key={item.href}>
															<LocaleLink
																href={item.href}
																className="block rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
															>
																{item.label}
															</LocaleLink>
														</li>
													),
												)}
											</ul>
										</NavigationMenuContent>
									</NavigationMenuItem>
								))}
								<NavigationMenuItem>
									<LocaleLink
										href="/contact"
										className="px-4 py-2 font-medium text-sm block shrink-0 text-foreground/80 transition-colors hover:text-foreground"
									>
										{t("common.menu.contact")}
									</LocaleLink>
								</NavigationMenuItem>
							</NavigationMenuList>
						</NavigationMenu>
					</div>

					<div className="gap-3 flex flex-1 items-center justify-end">
						<ColorModeToggle />
						<Suspense>
							<LocaleSwitch />
						</Suspense>

						{/* Mobile menu */}
						<Sheet
							open={mobileMenuOpen}
							onOpenChange={(open) => setMobileMenuOpen(open)}
						>
							<SheetTrigger asChild>
								<Button
									className="lg:hidden"
									size="icon"
									variant="secondary"
									aria-label={t("common.aria.menu")}
								>
									<MenuIcon className="size-4" />
								</Button>
							</SheetTrigger>
							<SheetContent className="w-[280px] overflow-y-auto" side="right">
								<SheetTitle />
								<div className="flex flex-col pt-2">
									{navGroups.map((group) => (
										<MobileNavGroup
											key={group.label}
											group={group}
											onClose={handleMobileMenuClose}
											localePathname={localePathname}
										/>
									))}
									<LocaleLink
										href="/contact"
										onClick={handleMobileMenuClose}
										className="px-3 py-2 font-medium text-base block shrink-0 text-foreground/80"
									>
										{t("common.menu.contact")}
									</LocaleLink>
									{config.saasUrl && (
										<NextLink
											href={config.saasUrl}
											className="px-3 py-2 text-base block"
											onClick={handleMobileMenuClose}
											prefetch
										>
											{t("common.menu.login")}
										</NextLink>
									)}
								</div>
							</SheetContent>
						</Sheet>

						{config.saasUrl && (
							<Button className="lg:flex hidden" asChild variant="secondary">
								<NextLink href={config.saasUrl} prefetch>
									{t("common.menu.login")}
								</NextLink>
							</Button>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
}

function MobileNavGroup({
	group,
	onClose,
	localePathname,
}: {
	group: NavGroup;
	onClose: () => void;
	localePathname: string;
}) {
	const [open, setOpen] = useState(false);
	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 font-medium text-base text-foreground/80 hover:text-foreground">
				{group.label}
				<ChevronDown
					className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
				/>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="flex flex-col pl-3 pb-1">
					{group.items.map((item) =>
						item.external ? (
							<a
								key={item.href}
								href={item.href}
								target="_blank"
								rel="noopener noreferrer"
								onClick={onClose}
								className="px-3 py-1.5 text-sm block text-foreground/70 hover:text-foreground"
							>
								{item.label}
							</a>
						) : (
							<LocaleLink
								key={item.href}
								href={item.href}
								onClick={onClose}
								className={cn(
									"px-3 py-1.5 text-sm block text-foreground/70",
									localePathname.startsWith(item.href)
										? "font-semibold text-foreground"
										: "hover:text-foreground",
								)}
							>
								{item.label}
							</LocaleLink>
						),
					)}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
