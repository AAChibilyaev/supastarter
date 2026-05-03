import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function CtaFooter() {
	const t = useTranslations();

	return (
		<section className="py-20 md:py-28 text-center">
			<div className="container">
				<div className="max-w-2xl mx-auto">
					<h2 className="font-bold text-3xl tracking-tight leading-tight md:text-5xl text-balance text-foreground">
						{t("home.cta.title")}
					</h2>
					<p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
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
								variant="outline"
								className="sm:w-auto w-full"
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
