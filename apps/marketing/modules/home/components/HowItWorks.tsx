import { useTranslations } from "next-intl";

const steps = ["step1", "step2", "step3"] as const;

export function HowItWorks() {
	const t = useTranslations();

	return (
		<section className="border-b border-border/60 py-20">
			<div className="container">
				<h2 className="mx-auto max-w-2xl text-balance text-center font-medium text-3xl tracking-tight md:text-4xl">
					{t("home.howItWorks.title")}
				</h2>

				<ol className="mt-12 grid gap-6 md:grid-cols-3">
					{steps.map((step, i) => (
						<li
							key={step}
							className="relative rounded-xl border border-border/70 bg-card/30 p-6 backdrop-blur transition hover:border-emerald-400/40"
						>
							<span className="-top-3 -translate-x-1/2 absolute left-6 inline-flex size-7 items-center justify-center rounded-md border border-emerald-400/40 bg-background font-mono text-emerald-300 text-xs">
								0{i + 1}
							</span>
							<h3 className="mt-2 font-medium text-foreground text-lg">
								{t(`home.howItWorks.${step}.title`)}
							</h3>
							<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
								{t(`home.howItWorks.${step}.description`)}
							</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}
