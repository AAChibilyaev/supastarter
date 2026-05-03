"use client";

import { config } from "@config";
import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui";
import { Badge } from "@repo/ui";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui";
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
		<section id="pricing" className="py-24 border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<Badge status="info" className="mb-4">
						{t("home.pricing.badge")}
					</Badge>
					<h2 className="font-semibold text-3xl tracking-tight leading-tight text-balance md:text-4xl">
						{t("home.pricing.title")}
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						{t("home.pricing.subtitle")}
					</p>
				</div>

				<div className="mt-8 flex justify-center">
					<Tabs value={interval} onValueChange={(v) => setInterval(v as BillingInterval)}>
						<TabsList className="p-0.5 rounded-full border bg-muted/50">
							<TabsTrigger
								value="monthly"
								className="px-4 py-1.5 text-sm data-[state=active]:shadow-sm rounded-full data-[state=active]:border-0 data-[state=active]:bg-background data-[state=active]:text-foreground"
							>
								{t("home.pricing.monthly")}
							</TabsTrigger>
							<TabsTrigger
								value="yearly"
								className="px-4 py-1.5 text-sm data-[state=active]:shadow-sm rounded-full data-[state=active]:border-0 data-[state=active]:bg-background data-[state=active]:text-foreground"
							>
								{t("home.pricing.yearly")}
								<Badge status="success" className="ml-2 px-1.5 py-0 text-[10px]">
									{t("home.pricing.yearlyDiscount")}
								</Badge>
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				<div className="mt-12 gap-6 lg:grid-cols-3 grid">
					{plans.map((plan) => {
						const features = Array.from({ length: plan.featuresCount }, (_, i) =>
							t(`home.pricing.plans.${plan.key}.features.${i}`),
						);

						return (
							<Card
								key={plan.key}
								className={cn(
									"relative flex flex-col",
									plan.primary
										? "shadow-lg border-primary/30 ring-1 shadow-primary/5 ring-primary/10"
										: "",
								)}
							>
								{plan.primary && (
									<div className="-top-3 inset-x-0 absolute flex justify-center">
										<Badge status="info" className="shadow-sm">
											{t(`home.pricing.plans.${plan.key}.highlight`)}
										</Badge>
									</div>
								)}

								<CardHeader className={plan.primary ? "pt-8" : ""}>
									<CardTitle>
										{t(`home.pricing.plans.${plan.key}.name`)}
									</CardTitle>
									<CardDescription>
										{t(`home.pricing.plans.${plan.key}.description`)}
									</CardDescription>
								</CardHeader>

								<CardContent className="flex-1">
									<div className="gap-1 flex items-baseline">
										<span className="font-bold text-4xl tracking-tight tabular-nums">
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

									<ul className="mt-8 gap-3 flex flex-col">
										{features.map((feature) => (
											<li
												key={feature}
												className="gap-3 text-sm flex items-start"
											>
												<CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
												<span className="text-muted-foreground">
													{feature}
												</span>
											</li>
										))}
									</ul>
								</CardContent>

								<CardFooter>
									<Button
										className={cn(
											"w-full",
											marketingCtaButtonClassName(plan.primary),
										)}
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
								</CardFooter>
							</Card>
						);
					})}
				</div>
			</div>
		</section>
	);
}
