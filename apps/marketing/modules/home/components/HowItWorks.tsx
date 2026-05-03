import { useTranslations } from "next-intl";

const steps = ["step1", "step2", "step3"] as const;

export function HowItWorks() {
	const t = useTranslations();

	return (
		<section className="py-16 md:py-24 border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
						{t("home.howItWorks.title")}
					</h2>
				</div>

				<div className="mt-16 gap-12 md:mt-20 lg:grid-cols-3 lg:gap-8 grid grid-cols-1">
					{steps.map((step, i) => (
						<div key={step} className="flex flex-col items-center text-center">
							<div className="size-14 flex items-center justify-center rounded-full bg-foreground text-background">
								<span className="text-lg font-bold">{i + 1}</span>
							</div>
							<h3 className="mt-6 text-lg font-semibold text-foreground">
								{t(`home.howItWorks.${step}.title`)}
							</h3>
							<p className="mt-3 max-w-xs text-sm font-light text-muted-foreground">
								{t(`home.howItWorks.${step}.description`)}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
