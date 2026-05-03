import { useTranslations } from "next-intl";

const steps = ["step1", "step2", "step3"] as const;

export function HowItWorks() {
	const t = useTranslations();

	return (
		<section className="border-b border-border py-14 md:py-24">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-bold text-3xl tracking-tight leading-tight text-balance md:text-4xl">
						{t("home.howItWorks.title")}
					</h2>
				</div>

				<div className="mt-16 grid grid-cols-1 gap-0 lg:grid-cols-3 md:mt-20">
					{steps.map((step, i) => (
						<div
							key={step}
							className="pb-12 last:pb-0 lg:pb-0 relative flex flex-col items-center text-center px-6"
						>
							{/* Connector line */}
							<div className="mb-8 relative flex w-full items-center justify-center">
								{i > 0 && (
									<div className="lg:block absolute top-1/2 right-1/2 hidden h-px w-full bg-border" />
								)}
								{i > 0 && (
									<div className="-top-10 h-10 lg:hidden absolute left-1/2 w-px bg-border" />
								)}

								{/* Number circle — solid pink */}
								<div className="size-14 z-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
									<span className="font-bold text-lg">{i + 1}</span>
								</div>

								{i < steps.length - 1 && (
									<div className="lg:block absolute top-1/2 left-1/2 hidden h-px w-full bg-border" />
								)}
								{i < steps.length - 1 && (
									<div className="top-14 h-10 lg:hidden absolute left-1/2 w-px bg-border" />
								)}
							</div>

							<h3 className="font-semibold text-lg text-foreground">
								{t(`home.howItWorks.${step}.title`)}
							</h3>
							<p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground text-pretty">
								{t(`home.howItWorks.${step}.description`)}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
