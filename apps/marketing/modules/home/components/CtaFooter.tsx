import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function CtaFooter() {
	const t = useTranslations();

	return (
		<section className="py-16 md:py-24 text-center">
			<div className="container">
				<div className="max-w-2xl mx-auto">
					<h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance">
						{t("home.cta.title")}
					</h2>

					<p className="mt-5 text-lg font-light max-w-2xl mx-auto text-balance text-muted-foreground">
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
