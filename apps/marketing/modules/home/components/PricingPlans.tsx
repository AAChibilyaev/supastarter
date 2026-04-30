import { config } from "@config";
import { cn } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const plans = [
	{ key: "free", featuresCount: 4, ctaKey: "cta", primary: false },
	{ key: "pro", featuresCount: 5, ctaKey: "cta", primary: true },
	{ key: "enterprise", featuresCount: 5, ctaKey: "contact", primary: false },
] as const;

export function PricingPlans() {
	const t = useTranslations();

	return (
		<section id="pricing" className="py-20 border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<div className="mb-3 gap-2 px-3 py-1 font-mono text-xs backdrop-blur inline-flex items-center rounded-full border border-border bg-card/40 text-muted-foreground">
						{t("home.pricing.badge")}
					</div>
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
						{t("home.pricing.title")}
					</h2>
					<p className="mt-3 text-muted-foreground">{t("home.pricing.subtitle")}</p>
				</div>

				<div className="mt-12 gap-6 lg:grid-cols-3 grid">
					{plans.map((plan) => {
						const features = Array.from({ length: plan.featuresCount }, (_, i) =>
							t(`home.pricing.plans.${plan.key}.features.${i}`),
						);

						return (
							<div
								key={plan.key}
								className={cn(
									"p-6 backdrop-blur relative flex flex-col rounded-xl border bg-card/30",
									plan.primary
										? "border-emerald-400/50 shadow-emerald-400/10 shadow-xl"
										: "border-border/70",
								)}
							>
								{plan.primary && (
									<span className="-top-3 left-6 border-emerald-400/50 px-2 py-0.5 font-mono text-emerald-300 absolute rounded-md border bg-background text-[11px]">
										{t(`home.pricing.plans.${plan.key}.highlight`)}
									</span>
								)}

								<h3 className="font-medium text-lg text-foreground">
									{t(`home.pricing.plans.${plan.key}.name`)}
								</h3>
								<div className="mt-4 gap-1 flex items-baseline">
									<span className="font-medium text-4xl tracking-tight">
										{t(`home.pricing.plans.${plan.key}.price`)}
									</span>
									{plan.key !== "enterprise" && (
										<span className="text-sm text-muted-foreground">
											{t("home.pricing.perMonth")}
										</span>
									)}
								</div>
								<p className="mt-2 text-sm text-muted-foreground">
									{t(`home.pricing.plans.${plan.key}.description`)}
								</p>

								<ul className="mt-6 gap-3 flex flex-1 flex-col">
									{features.map((feature) => (
										<li
											key={feature}
											className="gap-2 text-sm flex items-start text-foreground/90"
										>
											<CheckIcon className="mt-0.5 size-4 text-emerald-300 shrink-0" />
											<span>{feature}</span>
										</li>
									))}
								</ul>

								<Button
									className="mt-8"
									variant={plan.primary ? "primary" : "outline"}
									asChild
								>
									<a
										href={
											plan.key === "enterprise"
												? "/contact"
												: (config.saasUrl ?? "/signup")
										}
									>
										{t(`home.pricing.${plan.ctaKey}`)}
									</a>
								</Button>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
