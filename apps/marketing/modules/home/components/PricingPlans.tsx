"use client";

import { config } from "@config";
import { Card, CardContent } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib";
import { CheckIcon, MinusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const plans = [
	{ key: "free", featuresCount: 4, ctaKey: "cta", primary: false } as const,
	{ key: "pro", featuresCount: 5, ctaKey: "cta", primary: true } as const,
	{
		key: "enterprise",
		featuresCount: 5,
		ctaKey: "contact",
		primary: false,
	} as const,
];

type BillingInterval = "monthly" | "yearly";

export function PricingPlans() {
	const t = useTranslations();
	const [interval, setInterval] = useState<BillingInterval>("monthly");

	return (
		<section id="pricing" className="section-padding border-b border-border/80">
			<div className="container">
				{/* Section header */}
				<div className="max-w-2xl mx-auto text-center">
					<p className="mb-4 text-xs font-medium tracking-[0.08em] text-muted-foreground/80">
						{t("home.pricing.badge")}
					</p>

					<h2 className="text-3xl font-semibold tracking-tight md:text-4xl leading-[1.02] text-balance text-foreground">
						{t("home.pricing.title")}
					</h2>

					<p className="mt-5 max-w-xl text-base font-normal leading-relaxed mx-auto text-balance text-muted-foreground">
						{t("home.pricing.subtitle")}
					</p>
				</div>

				{/* Billing toggle */}
				<div className="mt-10 flex justify-center">
					<div className="gap-0.5 p-0.5 inline-flex items-center rounded-2xl border border-border/60 bg-muted/60">
						{(["monthly", "yearly"] as const).map((v) => (
							<button
								key={v}
								type="button"
								onClick={() => setInterval(v)}
								className={cn(
									"px-4 py-1.5 text-sm font-medium relative rounded-xl transition-all duration-200",
									interval === v
										? "shadow-2xs bg-card text-foreground ring-1 ring-border/40"
										: "text-muted-foreground/70 hover:bg-muted/40 hover:text-muted-foreground",
								)}
							>
								{t(`home.pricing.${v}`)}
								{v === "yearly" && (
									<span className="ml-1.5 font-medium text-[10px] text-muted-foreground/50">
										{t("home.pricing.yearlyDiscount")}
									</span>
								)}
							</button>
						))}
					</div>
				</div>

				{/* Pricing cards grid */}
				<div className="mt-12 gap-5 sm:grid-cols-2 lg:grid-cols-3 grid grid-cols-1">
					{plans.map((plan) => {
						const features = Array.from({ length: plan.featuresCount }, (_, i) =>
							t(`home.pricing.plans.${plan.key}.features.${i}`),
						);

						return (
							<Card
								key={plan.key}
								className={cn(
									"relative flex flex-col transition-all duration-300",
									plan.primary
										? "border-border/80 shadow-[0_24px_64px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.30)]"
										: "border-border/50 shadow-none",
									plan.primary &&
										"hover:shadow-[0_32px_80px_rgba(15,23,42,0.11)] dark:hover:shadow-[0_32px_80px_rgba(0,0,0,0.35)]",
									!plan.primary &&
										"hover:border-border/80 hover:shadow-[0_24px_64px_rgba(15,23,42,0.06)] dark:hover:shadow-[0_24px_64px_rgba(0,0,0,0.20)]",
								)}
							>
								<CardContent className="gap-6 p-8 md:p-9 flex h-full flex-col">
									{/* Top accent line for featured */}
									{plan.primary && (
										<div className="inset-x-0 top-0 absolute h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
									)}

									{/* Name + description */}
									<div>
										<p className="text-sm font-semibold text-foreground">
											{t(`home.pricing.plans.${plan.key}.name`)}
										</p>
										<p className="mt-1.5 text-sm font-normal leading-relaxed text-balance text-muted-foreground/80">
											{t(`home.pricing.plans.${plan.key}.description`)}
										</p>
									</div>

									{/* Price */}
									<div className="gap-1.5 flex items-baseline">
										<span className="font-semibold text-[2.25rem] leading-none tracking-[-0.04em] text-foreground tabular-nums">
											{t(`home.pricing.plans.${plan.key}.price`)}
										</span>
										{plan.key !== "enterprise" && (
											<span className="text-sm font-normal text-muted-foreground/60">
												{interval === "monthly"
													? t("home.pricing.perMonth")
													: t("home.pricing.perYear")}
											</span>
										)}
									</div>

									{/* CTA */}
									<a
										href={
											plan.key === "enterprise"
												? "/contact"
												: (config.saasUrl ?? "/signup")
										}
										className={cn(
											"px-4 py-2.5 text-sm font-semibold inline-flex w-full items-center justify-center rounded-2xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden",
											plan.primary
												? "shadow-xs bg-foreground text-background hover:bg-foreground/90"
												: "border border-border/70 bg-transparent text-foreground hover:border-border hover:bg-muted/50",
										)}
									>
										{t(`home.pricing.${plan.ctaKey}`)}
									</a>

									{/* Features list */}
									<ul className="gap-3 flex flex-col">
										{features.map((feature) => (
											<li
												key={feature}
												className="gap-3 text-sm flex items-start"
											>
												<CheckIcon className="mt-0.5 size-4 shrink-0 text-foreground/30" />
												<span className="font-normal leading-relaxed text-pretty text-muted-foreground/80">
													{feature}
												</span>
											</li>
										))}
									</ul>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</section>
	);
}
