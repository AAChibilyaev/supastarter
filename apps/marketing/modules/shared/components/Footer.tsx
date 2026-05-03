import { config } from "@config";
import { LocaleLink } from "@i18n/routing";
import { Logo } from "@repo/ui";
import { useTranslations } from "next-intl";

export function Footer() {
	const t = useTranslations();

	const links = [
		{ href: "/features", label: t("common.menu.features") },
		{ href: "/pricing", label: t("common.menu.pricing") },
		{ href: "/enterprise", label: t("common.menu.enterprise") },
		{ href: "/blog", label: t("common.menu.blog") },
		...(config.docsUrl
			? [{ href: config.docsUrl, label: t("common.menu.docs"), external: true as const }]
			: []),
		{ href: "/developers", label: t("common.menu.developers") },
		{ href: "/faq", label: t("common.menu.faq") },
		{ href: "/about", label: t("common.menu.about") },
		{ href: "/contact", label: t("common.menu.contact") },
	];

	return (
		<footer className="py-12 border-t">
			<div className="gap-8 md:flex-row md:items-center md:justify-between container flex flex-col">
				<div>
					<Logo className="h-8 w-auto opacity-70 grayscale" />
					<p className="mt-2 text-sm text-muted-foreground">
						{t("common.footer.tagline")}
					</p>
				</div>
				<nav className="gap-x-6 gap-y-2 flex flex-wrap">
					{links.map((link) =>
						link.external ? (
							<a
								key={link.label}
								href={link.href}
								className="text-sm text-muted-foreground transition-colors hover:text-foreground"
							>
								{link.label}
							</a>
						) : (
							<LocaleLink
								key={link.label}
								href={link.href}
								className="text-sm text-muted-foreground transition-colors hover:text-foreground"
							>
								{link.label}
							</LocaleLink>
						),
					)}
				</nav>
			</div>
		</footer>
	);
}
