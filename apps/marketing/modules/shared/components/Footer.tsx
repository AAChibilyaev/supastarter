import { config } from "@config";
import { LocaleLink } from "@i18n/routing";
import { Logo, Separator } from "@repo/ui";
import { useTranslations } from "next-intl";

export function Footer() {
	const t = useTranslations();

	return (
		<footer className="py-16 text-sm border-t">
			<div className="container">
				<div className="gap-8 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr] sm:grid-cols-2 grid grid-cols-1">
					{/* Brand */}
					<div className="lg:col-span-1 sm:col-span-2 col-span-1">
						<Logo className="h-8 w-auto opacity-70 grayscale" />
						<p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
							{t("common.footer.tagline")}
						</p>
					</div>

					{/* Product */}
					<div>
						<h4 className="mb-4 font-medium text-xs tracking-wider text-foreground uppercase">
							{t("common.menu.product")}
						</h4>
						<ul className="gap-3 flex flex-col">
							<li>
								<LocaleLink
									href="/features"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.features")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/pricing"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.pricing")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/enterprise"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.enterprise")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/ai-search"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.aiSearch")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/roadmap"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.roadmap")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/changelog"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.changelog")}
								</LocaleLink>
							</li>
						</ul>
					</div>

					{/* Solutions */}
					<div>
						<h4 className="mb-4 font-medium text-xs tracking-wider text-foreground uppercase">
							{t("common.menu.solutions")}
						</h4>
						<ul className="gap-3 flex flex-col">
							<li>
								<LocaleLink
									href="/use-cases"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.useCases")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/integrations"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.integrations")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/customers"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.customers")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/compare"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.compare")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/developers"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.developers")}
								</LocaleLink>
							</li>
						</ul>
					</div>

					{/* Resources */}
					<div>
						<h4 className="mb-4 font-medium text-xs tracking-wider text-foreground uppercase">
							{t("common.menu.resources")}
						</h4>
						<ul className="gap-3 flex flex-col">
							<li>
								<LocaleLink
									href="/blog"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.blog")}
								</LocaleLink>
							</li>
							{config.docsUrl && (
								<li>
									<a
										href={config.docsUrl}
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										{t("common.menu.docs")}
									</a>
								</li>
							)}
							<li>
								<LocaleLink
									href="/faq"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.faq")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/glossary"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.glossary")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/open-source"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.openSource")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/status"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.footer.status")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/support"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.footer.support")}
								</LocaleLink>
							</li>
						</ul>
					</div>

					{/* Company */}
					<div>
						<h4 className="mb-4 font-medium text-xs tracking-wider text-foreground uppercase">
							{t("common.menu.company")}
						</h4>
						<ul className="gap-3 flex flex-col">
							<li>
								<LocaleLink
									href="/about"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.about")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/careers"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.careers")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/partners"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.partners")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/press"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.press")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/security"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.security")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/contact"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.menu.contact")}
								</LocaleLink>
							</li>
						</ul>
					</div>

					{/* Legal */}
					<div>
						<h4 className="mb-4 font-medium text-xs tracking-wider text-foreground uppercase">
							{t("common.footer.legal")}
						</h4>
						<ul className="gap-3 flex flex-col">
							<li>
								<LocaleLink
									href="/legal/privacy-policy"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.footer.privacyPolicy")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/legal/terms"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.footer.termsAndConditions")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/trust"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.footer.trust")}
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/brand"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.footer.brand")}
								</LocaleLink>
							</li>
						</ul>
					</div>
				</div>

				<Separator className="mt-12 mb-8" />

				<div className="sm:flex-row gap-4 flex flex-col items-center justify-between">
					<p className="text-xs text-muted-foreground">
						&copy; {new Date().getFullYear()} {config.appName}. All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	);
}
