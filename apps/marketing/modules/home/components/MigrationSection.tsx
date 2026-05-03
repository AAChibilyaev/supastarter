import { useTranslations } from "next-intl";

const STEPS = ["export", "import", "switch", "monitor"] as const;

const stepIndex = ["01", "02", "03", "04"];

export function MigrationSection() {
	const t = useTranslations();

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeMigration.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeMigration.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 gap-6 grid grid-cols-1 sm:grid-cols-2">
					{STEPS.map((step, i) => (
						<div key={step} className="gap-4 flex items-start">
							<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-medium text-foreground/60">
								{stepIndex[i]}
							</div>
							<div className="min-w-0">
								<h3 className="text-base font-light text-foreground">
									{t(`homeMigration.steps.${step}.title`)}
								</h3>
								<p className="mt-1 text-sm font-light leading-relaxed text-pretty text-muted-foreground">
									{t(`homeMigration.steps.${step}.description`)}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
