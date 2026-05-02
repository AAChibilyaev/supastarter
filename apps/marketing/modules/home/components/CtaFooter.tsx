import { config } from "@config";
import { cn } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import { useTranslations } from "next-intl";

import { marketingCtaButtonClassName } from "../../shared/lib/cta-button-styles";

export function CtaFooter() {
	const t = useTranslations();

	return (
		<section className="py-24 relative overflow-hidden">
			{/* Gradient backgrounds */}
			<div className="-top-24 -right-24 size-96 blur-3xl absolute rounded-full bg-primary/10" />
			<div className="-bottom-24 -left-24 size-96 blur-3xl absolute rounded-full bg-accent/20" />

			<div className="relative container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
						{t("home.cta.title")}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">{t("home.cta.subtitle")}</p>
					<div className="mt-8 w-full overflow-x-auto">
						<div className="mx-auto flex w-max items-center justify-center gap-4">
							<Button
								className={cn(marketingCtaButtonClassName(true), "shrink-0")}
								size="lg"
								variant="primary"
								asChild
							>
								<a href={config.saasUrl ?? "/signup"}>{t("home.cta.primary")}</a>
							</Button>
							{config.docsUrl && (
								<Button className="shrink-0" size="lg" variant="ghost" asChild>
									<a href={config.docsUrl}>{t("home.cta.secondary")}</a>
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
