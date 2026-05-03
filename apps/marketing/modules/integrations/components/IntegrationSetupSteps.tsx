import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import { useTranslations } from "next-intl";

interface IntegrationSetupStepsProps {
	namespace: string;
	stepCount: 3 | 5;
	ctaHref?: string;
}

export function IntegrationSetupSteps({
	namespace,
	stepCount,
	ctaHref,
}: IntegrationSetupStepsProps) {
	const t = useTranslations(namespace);
	const steps = Array.from({ length: stepCount }, (_, i) => i + 1);
	const href = ctaHref ?? config.docsUrl ?? "/docs";

	return (
		<section className="section-padding border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
				</div>

				<ol className="mt-16 max-w-3xl space-y-10 mx-auto">
					{steps.map((n) => (
						<li key={n} className="gap-6 flex">
							<div className="mt-0.5 flex-none">
								<span className="size-10 font-bold text-sm flex items-center justify-center rounded-full bg-primary/10 text-primary">
									{n}
								</span>
							</div>
							<div>
								<p className="text-xs font-semibold tracking-widest mb-1 text-primary uppercase">
									{t(`step${n}.label`)}
								</p>
								<h3 className="font-semibold text-lg">{t(`step${n}.title`)}</h3>
								<p className="mt-1 text-muted-foreground">
									{t(`step${n}.description`)}
								</p>
							</div>
						</li>
					))}
				</ol>

				<div className="mt-12 text-center">
					<Button asChild size="lg" variant="primary">
						<a href={href}>{t("cta")}</a>
					</Button>
				</div>
			</div>
		</section>
	);
}
