import { config } from "@config";
import { LocaleLink } from "@i18n/routing";
import { Logo, Separator } from "@repo/ui";
import { useTranslations } from "next-intl";

export function Footer() {
	const t = useTranslations();

	return (
		<footer className="py-16 text-sm border-t">
			<div className="container">
				<div className="gap-12 lg:grid-cols-[2fr_1fr_1fr_1fr] sm:grid-cols-2 grid grid-cols-1">
					{/* Brand column */}
					<div>
						<Logo className="h-8 w-auto opacity-70 grayscale" />
						<p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
							Search as a service — scoped tokens, origin allow-lists, and a typed
							browser SDK.
						</p>
					</div>

					{/* Product links */}
					<div>
						<h4 className="mb-4 font-medium text-xs tracking-wider text-foreground uppercase">
							Product
						</h4>
						<ul className="gap-3 flex flex-col">
							<li>
								<a
									href="#features"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.footer.features")}
								</a>
							</li>
							<li>
								<a
									href="/#pricing"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.footer.pricing")}
								</a>
							</li>
							<li>
								<LocaleLink
									href="/blog"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("common.footer.blog")}
								</LocaleLink>
							</li>
						</ul>
					</div>

					{/* Resources links */}
					<div>
						<h4 className="mb-4 font-medium text-xs tracking-wider text-foreground uppercase">
							Resources
						</h4>
						<ul className="gap-3 flex flex-col">
							<li>
								<a
									href={config.docsUrl ?? "#"}
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									Docs
								</a>
							</li>
							<li>
								<LocaleLink
									href="/changelog"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									Changelog
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/contact"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									Contact
								</LocaleLink>
							</li>
						</ul>
					</div>

					{/* Legal links */}
					<div>
						<h4 className="mb-4 font-medium text-xs tracking-wider text-foreground uppercase">
							Legal
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
