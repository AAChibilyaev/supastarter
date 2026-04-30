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

				<ol className="mt-12 gap-6 md:grid-cols-3 grid">
					{steps.map((step, i) => (
						<li
							key={step}
							className="p-6 backdrop-blur hover:border-pink-400/50 relative rounded-xl border border-border/70 bg-card/30 transition"
						>
							<span className="-top-3 left-6 size-7 border-pink-400/50 font-mono text-pink-400 text-xs absolute inline-flex -translate-x-1/2 items-center justify-center rounded-md border bg-background">
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
