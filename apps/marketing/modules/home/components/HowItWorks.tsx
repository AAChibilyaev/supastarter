import { useTranslations } from "next-intl";

const steps = ["step1", "step2", "step3"] as const;

export function HowItWorks() {
	const t = useTranslations();

	return (
		<section className="py-24 border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-semibold text-3xl tracking-tight leading-tight text-balance md:text-4xl">
						{t("home.howItWorks.title")}
					</h2>
				</div>

				<div className="mt-20 lg:grid-cols-3 gap-0 grid grid-cols-1">
					{steps.map((step, i) => (
						<div key={step} className="relative flex flex-col items-center text-center">
							{/* Timeline line — top half connects to previous, bottom half to next */}
							<div className="mb-6 relative flex w-full items-center justify-center">
								{/* Left connector line (hidden on first) */}
								{i > 0 && (
									<div className="lg:block absolute top-1/2 right-1/2 hidden h-px w-full bg-border" />
								)}
								{/* Vertical connector on mobile */}
								{i > 0 && (
									<div className="-top-10 h-10 lg:hidden absolute left-1/2 w-px bg-border" />
								)}

								{/* Number circle */}
								<div className="size-12 shadow-sm z-10 flex items-center justify-center rounded-full border-2 border-primary/30 bg-background">
									<span className="font-semibold text-sm text-primary">
										{i + 1}
									</span>
								</div>

								{/* Right connector line (hidden on last) */}
								{i < steps.length - 1 && (
									<div className="lg:block absolute top-1/2 left-1/2 hidden h-px w-full bg-border" />
								)}
								{/* Vertical connector on mobile */}
								{i < steps.length - 1 && (
									<div className="top-12 h-10 lg:hidden absolute left-1/2 w-px bg-border" />
								)}
							</div>

							{/* Step content */}
							<h3 className="font-semibold text-lg text-foreground">
								{t(`home.howItWorks.${step}.title`)}
							</h3>
							<p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
								{t(`home.howItWorks.${step}.description`)}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
