import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function CtaFooter() {
	const t = useTranslations();

	return (
		<section className="py-20 md:py-28 bg-foreground">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-bold text-3xl tracking-tight leading-tight md:text-5xl text-balance text-background">
						{t("home.cta.title")}
					</h2>
					<p className="mt-5 text-lg leading-relaxed text-pretty text-background/55">
						{t("home.cta.subtitle")}
					</p>
					<div className="mt-8 gap-4 flex flex-wrap items-center justify-center">
						<Button size="lg" variant="primary" className="sm:w-auto w-full" asChild>
							<a href={config.saasUrl ?? "/signup"}>
								{t("home.cta.primary")}
								<ArrowRightIcon className="ml-2 size-4" />
							</a>
						</Button>
						{config.docsUrl && (
							<Button
								size="lg"
								variant="ghost"
								className="sm:w-auto w-full text-background/60 hover:text-background hover:bg-background/10"
								asChild
							>
								<a href={config.docsUrl}>{t("home.cta.secondary")}</a>
							</Button>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
