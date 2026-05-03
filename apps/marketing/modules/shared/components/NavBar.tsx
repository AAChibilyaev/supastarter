"use client";

import { config } from "@config";
import { LocaleLink, useLocalePathname } from "@i18n/routing";
import { cn, Logo } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@repo/ui/components/sheet";
import { ColorModeToggle } from "@shared/components/ColorModeToggle";
import { LocaleSwitch } from "@shared/components/LocaleSwitch";
import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { Suspense, useEffect, useState } from "react";

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

	const handleMobileMenuClose = () => {
		setMobileMenuOpen(false);
	};

	useEffect(() => {
		// Listen for custom toggle-menu event from mobile bottom bar
		const handler = () => setMobileMenuOpen((prev) => !prev);
		window.addEventListener("aacsearch:toggle-menu", handler);
		return () => window.removeEventListener("aacsearch:toggle-menu", handler);
	}, []);

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
			className="top-0 backdrop-blur-md sticky z-50 w-full border-b border-border/50 bg-background/80"
			data-test="navigation"
		>
			<div className="container">
				<div className="py-4 gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-6 flex items-center justify-between">
					<div className="min-w-0 flex shrink-0 items-center justify-start">
						<LocaleLink
							href="/"
							className="block hover:no-underline active:no-underline"
						>
							<Logo />
						</LocaleLink>
					</div>

					{/* Desktop: inline nav links */}
					<div className="lg:flex gap-1 hidden items-center justify-self-center">
						{navGroups.map((group) => (
							<LocaleLink
								key={group.label}
								href={group.items[0].href}
								className="px-3 py-2 text-sm font-light text-foreground/80 transition-colors hover:text-foreground"
							>
								{group.label}
							</LocaleLink>
						))}
						<LocaleLink
							href="/contact"
							className="px-3 py-2 text-sm font-light text-foreground/80 transition-colors hover:text-foreground"
						>
							{t("common.menu.contact")}
						</LocaleLink>
					</div>

					<div className="min-w-0 gap-3 flex items-center justify-end">
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
								<div className="pt-2 flex flex-col">
									{/* Flat list of all nav group links */}
									{navGroups.flatMap((group) => [
										<div
											key={group.label}
											className="px-4 py-3 text-xs font-light tracking-wider text-foreground/50 uppercase"
										>
											{group.label}
										</div>,
										...group.items.map((item) =>
											item.external ? (
												<a
													key={item.href}
													href={item.href}
													target="_blank"
													rel="noopener noreferrer"
													onClick={handleMobileMenuClose}
													className="px-4 py-3 text-sm block text-foreground/70 hover:text-foreground"
												>
													{item.label}
												</a>
											) : (
												<LocaleLink
													key={item.href}
													href={item.href}
													onClick={handleMobileMenuClose}
													className={cn(
														"px-4 py-3 text-sm block text-foreground/70",
														localePathname.startsWith(item.href)
															? "font-light text-foreground"
															: "hover:text-foreground",
													)}
												>
													{item.label}
												</LocaleLink>
											),
										),
									])}
									<div className="my-2 border-t border-border/50" />
									<LocaleLink
										href="/contact"
										onClick={handleMobileMenuClose}
										className="px-4 py-3 font-light text-base block shrink-0 text-foreground/80"
									>
										{t("common.menu.contact")}
									</LocaleLink>
									{config.saasUrl && (
										<NextLink
											href={config.saasUrl}
											className="px-4 py-3 text-base block"
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
