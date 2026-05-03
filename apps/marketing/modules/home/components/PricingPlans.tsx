"use client";

import { config } from "@config";
import { cn } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { marketingCtaButtonClassName } from "../../shared/lib/cta-button-styles";

const plans = [
	{ key: "free", featuresCount: 4, ctaKey: "cta", primary: false },
	{ key: "pro", featuresCount: 5, ctaKey: "cta", primary: true },
	{ key: "enterprise", featuresCount: 5, ctaKey: "contact", primary: false },
] as const;

type BillingInterval = "monthly" | "yearly";

export function PricingPlans() {
	const t = useTranslations();
	const [interval, setInterval] = useState<BillingInterval>("monthly");

	return (
		<section id="pricing" className="border-b border-border py-14 md:py-24">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
						{t("home.pricing.badge")}
					</p>
					<h2 className="font-bold text-3xl tracking-tight leading-tight text-balance md:text-4xl">
						{t("home.pricing.title")}
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
						{t("home.pricing.subtitle")}
					</p>
				</div>

				{/* Billing toggle */}
				<div className="mt-8 flex justify-center">
					<div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
						{(["monthly", "yearly"] as const).map((v) => (
							<button
								key={v}
								type="button"
								onClick={() => setInterval(v)}
								className={cn(
									"px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
									interval === v
										? "bg-card text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{t(`home.pricing.${v}`)}
								{v === "yearly" && (
									<span className="ml-1.5 text-[10px] font-semibold text-success">
										{t("home.pricing.yearlyDiscount")}
									</span>
								)}
							</button>
						))}
					</div>
				</div>

				<div className="mt-10 grid gap-px bg-border overflow-hidden rounded-lg border border-border sm:grid-cols-2 lg:grid-cols-3">
					{plans.map((plan) => {
						const features = Array.from({ length: plan.featuresCount }, (_, i) =>
							t(`home.pricing.plans.${plan.key}.features.${i}`),
						);

						return (
							<div
								key={plan.key}
								className={cn(
									"relative flex flex-col bg-card p-7",
									plan.primary && "bg-primary/3",
								)}
							>
								{plan.primary && (
									<div className="absolute top-0 inset-x-0 h-0.5 bg-primary" />
								)}

								<div className="mb-6">
									<p className="font-semibold text-base text-foreground">
										{t(`home.pricing.plans.${plan.key}.name`)}
									</p>
									<p className="mt-1 text-sm text-muted-foreground text-pretty">
										{t(`home.pricing.plans.${plan.key}.description`)}
									</p>
								</div>

								<div className="mb-6 flex items-baseline gap-1">
									<span className="font-bold text-4xl tracking-tight tabular-nums text-foreground">
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
									className={cn("w-full", marketingCtaButtonClassName(plan.primary))}
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

								<ul className="mt-6 flex flex-col gap-3">
									{features.map((feature) => (
										<li key={feature} className="flex items-start gap-3 text-sm">
											<CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
											<span className="text-muted-foreground text-pretty">
												{feature}
											</span>
										</li>
									))}
								</ul>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
