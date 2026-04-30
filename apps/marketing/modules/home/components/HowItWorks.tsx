import { useTranslations } from "next-intl";

const steps = ["step1", "step2", "step3"] as const;

export function HowItWorks() {
	const t = useTranslations();

	return (
		<section className="py-20 border-b border-border/60">
			<div className="container">
				<h2 className="max-w-2xl font-medium text-3xl tracking-tight md:text-4xl mx-auto text-center text-balance">
					{t("home.howItWorks.title")}
				</h2>

				<ol className="mt-12 md:grid-cols-3 grid gap-px overflow-hidden rounded-none border border-border/80 bg-border/80">
					{steps.map((step, i) => (
						<li
							key={step}
							className="p-6 backdrop-blur relative rounded-none bg-card/40 transition hover:bg-card/70"
						>
							<span className="-top-3 left-6 size-7 text-xs absolute inline-flex -translate-x-1/2 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground">
								0{i + 1}
							</span>
							<h3 className="mt-2 font-medium text-lg text-foreground">
								{t(`home.howItWorks.${step}.title`)}
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								{t(`home.howItWorks.${step}.description`)}
							</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}
