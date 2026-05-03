import { config } from "@config";
import { cn } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import { useTranslations } from "next-intl";

import { marketingCtaButtonClassName } from "../../shared/lib/cta-button-styles";

export function CtaFooter() {
	const t = useTranslations();

	return (
		<section className="py-14 md:py-24 relative overflow-hidden">
			{/* Gradient backgrounds */}
			<div className="-top-24 -right-24 size-96 blur-3xl absolute rounded-full bg-primary/10" />
			<div className="-bottom-24 -left-24 size-96 blur-3xl absolute rounded-full bg-accent/20" />

			<div className="relative container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-semibold text-3xl tracking-tight leading-tight md:text-4xl text-balance">
						{t("home.cta.title")}
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						{t("home.cta.subtitle")}
					</p>
					<div className="mt-8 gap-4 flex flex-wrap items-center justify-center">
						<Button
							className={cn(marketingCtaButtonClassName(true), "sm:w-auto w-full")}
							size="lg"
							variant="primary"
							asChild
						>
							<a href={config.saasUrl ?? "/signup"}>{t("home.cta.primary")}</a>
						</Button>
						{config.docsUrl && (
							<Button className="sm:w-auto w-full" size="lg" variant="ghost" asChild>
								<a href={config.docsUrl}>{t("home.cta.secondary")}</a>
							</Button>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
