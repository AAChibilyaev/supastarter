import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function CtaFooter() {
	const t = useTranslations();

	return (
		<section className="bg-foreground py-20 md:py-28">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-bold text-3xl tracking-tight leading-tight text-balance text-background md:text-5xl">
						{t("home.cta.title")}
					</h2>
					<p className="mt-5 text-lg leading-relaxed text-background/55 text-pretty">
						{t("home.cta.subtitle")}
					</p>
					<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
						<Button
							size="lg"
							variant="primary"
							className="w-full sm:w-auto"
							asChild
						>
							<a href={config.saasUrl ?? "/signup"}>
								{t("home.cta.primary")}
								<ArrowRightIcon className="ml-2 size-4" />
							</a>
						</Button>
						{config.docsUrl && (
							<Button
								size="lg"
								variant="ghost"
								className="w-full sm:w-auto text-background/70 hover:text-background hover:bg-white/8"
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
