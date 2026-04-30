import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import { useTranslations } from "next-intl";

export function CtaFooter() {
	const t = useTranslations();

	return (
		<section className="py-20">
			<div className="container">
				<div className="p-10 md:p-16 relative overflow-hidden rounded-2xl border border-border/70 bg-card/40 text-center">
					<div className="inset-0 absolute -z-10 bg-[radial-gradient(circle_at_50%_0%,oklch(0.55_0.18_155/0.18),transparent_60%)]" />
					<h2 className="max-w-2xl font-medium text-3xl tracking-tight md:text-4xl mx-auto text-balance">
						{t("home.cta.title")}
					</h2>
					<p className="mt-3 text-muted-foreground">{t("home.cta.subtitle")}</p>
					<div className="mt-8 gap-3 flex flex-wrap items-center justify-center">
						<Button size="lg" variant="primary" asChild>
							<a href={config.saasUrl ?? "/signup"}>{t("home.cta.primary")}</a>
						</Button>
						{config.docsUrl && (
							<Button size="lg" variant="ghost" asChild>
								<a href={config.docsUrl}>{t("home.cta.secondary")}</a>
							</Button>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
