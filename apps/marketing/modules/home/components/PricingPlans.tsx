"use client";

import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const plans = [
	{ key: "free", featuresCount: 4, ctaKey: "cta", primary: false } as const,
	{ key: "pro", featuresCount: 5, ctaKey: "cta", primary: true } as const,
	{ key: "enterprise", featuresCount: 5, ctaKey: "contact", primary: false } as const,
];

type BillingInterval = "monthly" | "yearly";

export function PricingPlans() {
	const t = useTranslations();
	const [interval, setInterval] = useState<BillingInterval>("monthly");

	return (
		<section id="pricing" className="py-16 md:py-24 border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
						{t("home.pricing.badge")}
					</p>

					<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
						{t("home.pricing.title")}
					</h2>

					<p className="mt-4 text-lg max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("home.pricing.subtitle")}
					</p>
				</div>

				{/* Billing toggle */}
				<div className="mt-8 flex justify-center">
					<div className="gap-1 p-1 flex items-center rounded-lg border border-border bg-muted">
						{(["monthly", "yearly"] as const).map((v) => (
							<button
								key={v}
								type="button"
								onClick={() => setInterval(v)}
								className={cn(
									"px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
									interval === v
										? "shadow-sm bg-card text-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{t(`home.pricing.${v}`)}
								{v === "yearly" && (
									<span className="ml-1.5 font-semibold text-[10px] text-success">
										{t("home.pricing.yearlyDiscount")}
									</span>
								)}
							</button>
						))}
					</div>
				</div>

				<div className="mt-10 sm:grid-cols-2 lg:grid-cols-3 gap-4 grid grid-cols-1">
					{plans.map((plan) => {
						const features = Array.from({ length: plan.featuresCount }, (_, i) =>
							t(`home.pricing.plans.${plan.key}.features.${i}`),
						);

						return (
							<Card
								key={plan.key}
								className={cn(
									"relative flex flex-col",
									plan.primary && "ring-1 ring-primary",
								)}
							>
								<CardContent className="p-7 flex h-full flex-col">
									{plan.primary && (
										<div className="top-0 inset-x-0 h-0.5 absolute bg-primary" />
									)}

									<div className="mb-6">
										<p className="font-semibold text-base text-foreground">
											{t(`home.pricing.plans.${plan.key}.name`)}
										</p>
										<p className="mt-1 text-sm text-pretty text-muted-foreground">
											{t(`home.pricing.plans.${plan.key}.description`)}
										</p>
									</div>

									<div className="mb-6 gap-1 flex items-baseline">
										<span className="font-bold text-4xl tracking-tight text-foreground tabular-nums">
											{t(`home.pricing.plans.${plan.key}.price`)}
										</span>
										{plan.key !== "enterprise" && (
											<span className="text-sm text-muted-foreground">
												{interval === "monthly"
													? t("home.pricing.perMonth")
													: t("home.pricing.perYear")}
											</span>
										)}
									</div>

									<Button
										className="w-full"
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

									<ul className="mt-6 gap-3 flex flex-col">
										{features.map((feature) => (
											<li
												key={feature}
												className="gap-3 text-sm flex items-start"
											>
												<CheckIcon className="mt-0.5 size-4 shrink-0 text-foreground/40" />
												<span className="text-pretty text-muted-foreground">
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
