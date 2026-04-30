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
		<section id="pricing" className="border-b border-border/60 py-20">
			<div className="container">
				<div className="mx-auto max-w-2xl text-center">
					<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 font-mono text-muted-foreground text-xs backdrop-blur">
						{t("home.pricing.badge")}
					</div>
					<h2 className="text-balance font-medium text-3xl tracking-tight md:text-4xl">
						{t("home.pricing.title")}
					</h2>
					<p className="mt-3 text-muted-foreground">{t("home.pricing.subtitle")}</p>
				</div>

				<div className="mt-12 grid gap-6 lg:grid-cols-3">
					{plans.map((plan) => {
						const features = Array.from({ length: plan.featuresCount }, (_, i) =>
							t(`home.pricing.plans.${plan.key}.features.${i}`),
						);

						return (
							<div
								key={plan.key}
								className={cn(
									"relative flex flex-col rounded-xl border bg-card/30 p-6 backdrop-blur",
									plan.primary
										? "border-emerald-400/50 shadow-emerald-400/10 shadow-xl"
										: "border-border/70",
								)}
							>
								{plan.primary && (
									<span className="-top-3 absolute left-6 rounded-md border border-emerald-400/50 bg-background px-2 py-0.5 font-mono text-[11px] text-emerald-300">
										{t(`home.pricing.plans.${plan.key}.highlight`)}
									</span>
								)}

								<h3 className="font-medium text-foreground text-lg">
									{t(`home.pricing.plans.${plan.key}.name`)}
								</h3>
								<div className="mt-4 flex items-baseline gap-1">
									<span className="font-medium text-4xl tracking-tight">
										{t(`home.pricing.plans.${plan.key}.price`)}
									</span>
									{plan.key !== "enterprise" && (
										<span className="text-muted-foreground text-sm">
											{t("home.pricing.perMonth")}
										</span>
									)}
								</div>
								<p className="mt-2 text-muted-foreground text-sm">
									{t(`home.pricing.plans.${plan.key}.description`)}
								</p>

								<ul className="mt-6 flex flex-1 flex-col gap-3">
									{features.map((feature) => (
										<li
											key={feature}
											className="flex items-start gap-2 text-foreground/90 text-sm"
										>
											<CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-300" />
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
