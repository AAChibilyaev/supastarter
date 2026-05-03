"use client";

import { usePlanData } from "@payments/hooks/plan-data";
import type { PlanId } from "@payments/types";
import { config as paymentsConfig } from "@repo/payments/config";
import type { PaidPlan } from "@repo/payments/types";
import { cn } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { useLocaleCurrency } from "@shared/hooks/locale-currency";
import { useRouter } from "@shared/hooks/router";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import {
	ArrowRightIcon,
	BadgePercentIcon,
	CheckIcon,
	DollarSignIcon,
	StarIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const plans = paymentsConfig.plans;

interface PlanSelection {
	type: "one-time" | "subscription";
	interval?: "month" | "year";
}

/** Gather all unique currencies available across all paid plans. */
function getAvailableCurrencies(): string[] {
	const currencySet = new Set<string>();
	for (const plan of Object.values(plans)) {
		if (!("prices" in plan)) continue;
		for (const price of (plan as PaidPlan).prices) {
			currencySet.add(price.currency);
		}
	}
	return Array.from(currencySet).sort();
}

const CURRENCY_LABELS: Record<string, { label: string; symbol: string }> = {
	USD: { label: "USD", symbol: "$" },
	RUB: { label: "RUB", symbol: "₽" },
	EUR: { label: "EUR", symbol: "€" },
};

export function PricingTable({
	className,
	userId,
	organizationId,
	activePlanId,
}: {
	className?: string;
	userId?: string;
	organizationId?: string;
	activePlanId?: string;
}) {
	const t = useTranslations();
	const format = useFormatter();
	const router = useRouter();
	const localeCurrency = useLocaleCurrency();
	const [loading, setLoading] = useState<PlanId | false>(false);
	const [interval, setInterval] = useState<"month" | "year">("month");
	const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

	const { planData } = usePlanData();

	const createCheckoutLinkMutation = useMutation(
		orpc.payments.createCheckoutLink.mutationOptions(),
	);

	// Use user-selected currency, falling back to locale-detected currency
	const displayCurrency = selectedCurrency ?? localeCurrency;

	// Collect available currencies from all paid plans
	const availableCurrencies = useMemo(() => getAvailableCurrencies(), []);

	const onSelectPlan = async (planId: PlanId, selection?: PlanSelection) => {
		if (!(userId || organizationId)) {
			router.push("/signup");
			return;
		}

		if (!selection) {
			return;
		}

		setLoading(planId);

		try {
			const { checkoutLink } = await createCheckoutLinkMutation.mutateAsync({
				planId,
				type: selection.type,
				interval: selection.interval,
				organizationId,
				redirectUrl: organizationId
					? `${window.location.origin}/checkout-return?organizationId=${organizationId}`
					: `${window.location.origin}/checkout-return`,
			});

			window.location.href = checkoutLink;
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	const filteredPlans = Object.entries(plans).filter(([planId]) => planId !== activePlanId);

	const hasSubscriptions = filteredPlans.some(([_, plan]) =>
		"prices" in plan
			? (plan as PaidPlan).prices.some((price) => price.type === "subscription")
			: false,
	);

	// Calculate annual savings from the first eligible plan for the current currency
	const annualSavingsPercent = (() => {
		for (const [, plan] of Object.entries(plans)) {
			if (!("prices" in plan)) continue;
			const prices = (plan as PaidPlan).prices;
			const monthlyPrice = prices.find(
				(p) =>
					p.type === "subscription" &&
					p.interval === "month" &&
					p.currency === displayCurrency,
			);
			const yearlyPrice = prices.find(
				(p) =>
					p.type === "subscription" &&
					p.interval === "year" &&
					p.currency === displayCurrency,
			);
			if (monthlyPrice && yearlyPrice) {
				return Math.round((1 - yearlyPrice.amount / 12 / monthlyPrice.amount) * 100);
			}
		}
		return 0;
	})();

	return (
		<div className={cn("@container", className)}>
			{/* Currency switcher + interval tabs */}
			<div className="mb-6 gap-3 flex items-center justify-center">
				{availableCurrencies.length > 1 && (
					<Select
						value={displayCurrency}
						onValueChange={(value) => setSelectedCurrency(value)}
					>
						<SelectTrigger className="w-24">
							<SelectValue>
								<div className="gap-1.5 flex items-center">
									<DollarSignIcon className="size-3.5" />
									{displayCurrency}
								</div>
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{availableCurrencies.map((currency) => {
								const info = CURRENCY_LABELS[currency] ?? {
									label: currency,
									symbol: currency,
								};
								return (
									<SelectItem key={currency} value={currency}>
										<span className="gap-2 flex items-center">
											<span className="text-muted-foreground">
												{info.symbol}
											</span>
											{info.label}
										</span>
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>
				)}

				{hasSubscriptions && (
					<Tabs
						value={interval}
						onValueChange={(value) => setInterval(value as typeof interval)}
						data-test="price-table-interval-tabs"
					>
						<TabsList className="border-foreground/10">
							<TabsTrigger value="month">{t("pricing.monthly")}</TabsTrigger>
							<TabsTrigger value="year">
								{t("pricing.yearly")}
								{annualSavingsPercent > 0 && (
									<span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
										{t("pricing.savePercent", {
											percent: annualSavingsPercent,
										})}
									</span>
								)}
							</TabsTrigger>
						</TabsList>
					</Tabs>
				)}
			</div>

			<div
				className={cn("gap-4 grid grid-cols-1", {
					"@xl:grid-cols-2": filteredPlans.length >= 2,
					"@3xl:grid-cols-3": filteredPlans.length >= 3,
					"@4xl:grid-cols-4": filteredPlans.length >= 4,
				})}
			>
				{filteredPlans.map(([planId, plan]) => {
					const isEnterprise = "isEnterprise" in plan ? plan.isEnterprise : false;
					const prices = "prices" in plan ? (plan as PaidPlan).prices : undefined;
					const recommended = plan.recommended ?? false;
					const hidden = plan.hidden ?? false;

					const planDataEntry = planData[planId as keyof typeof planData];

					if (!planDataEntry) {
						return null;
					}

					const { title, description, features } = planDataEntry;

					// Find a price matching the display currency and interval
					const price = prices?.find(
						(price) =>
							!hidden &&
							(price.type === "one-time" || price.interval === interval) &&
							price.currency === displayCurrency,
					);

					if (!price && !isEnterprise) {
						return null;
					}

					return (
						<div
							key={planId}
							className={cn("p-6 rounded-3xl border bg-card", {
								"border-primary": recommended,
							})}
							data-test="price-table-plan"
						>
							<div className="gap-4 flex h-full flex-col justify-between">
								<div>
									{recommended && (
										<div className="-mt-9 flex justify-center">
											<div className="mb-2 h-6 gap-1.5 px-2 py-1 font-semibold text-xs flex w-auto items-center rounded-full bg-primary text-primary-foreground">
												<StarIcon className="size-3" />
												{t("pricing.recommended")}
											</div>
										</div>
									)}
									<h3
										className={cn("my-0 font-semibold text-2xl", {
											"font-bold text-primary": recommended,
										})}
									>
										{title}
									</h3>
									{description && (
										<div className="prose mt-2 text-sm text-foreground/60">
											{description}
										</div>
									)}

									{!!features?.length && (
										<ul className="mt-4 gap-2 text-sm grid list-none">
											{features.map((feature, key) => (
												<li
													key={key}
													className="flex items-center justify-start"
												>
													<CheckIcon className="mr-2 size-4 text-primary" />
													<span>{feature}</span>
												</li>
											))}
										</ul>
									)}

									{price &&
										"trialPeriodDays" in price &&
										price.trialPeriodDays && (
											<div className="mt-4 font-medium text-sm flex items-center justify-start text-primary opacity-80">
												<BadgePercentIcon className="mr-2 size-4" />
												{t("pricing.trialPeriod", {
													days: price.trialPeriodDays,
												})}
											</div>
										)}
								</div>

								<div>
									{price && (
										<>
											<strong
												className="font-medium text-2xl lg:text-3xl block"
												data-test="price-table-plan-price"
											>
												{format.number(price.amount, {
													style: "currency",
													currency: price.currency,
												})}
												{"interval" in price && (
													<span className="font-normal text-xs opacity-60">
														{" / "}
														{interval === "month"
															? t("pricing.month", {
																	count: 1,
																})
															: t("pricing.year", {
																	count: 1,
																})}
													</span>
												)}
												{organizationId &&
													"seatBased" in price &&
													price.seatBased && (
														<span className="font-normal text-xs opacity-60">
															{" / "}
															{t("pricing.perSeat")}
														</span>
													)}
											</strong>

											{/* Show alternative currency price as hint */}
											{availableCurrencies.length > 1 && (
												<AlternativePriceHint
													prices={prices ?? []}
													displayCurrency={displayCurrency}
													interval={interval}
													format={format}
												/>
											)}
										</>
									)}

									<Button
										className="mt-4 w-full"
										variant={recommended ? "primary" : "secondary"}
										onClick={() =>
											onSelectPlan(
												planId as PlanId,
												price
													? {
															type:
																price.type === "one-time"
																	? "one-time"
																	: "subscription",
															interval:
																price.type === "subscription"
																	? price.interval
																	: undefined,
														}
													: undefined,
											)
										}
										loading={loading === planId}
									>
										{userId || organizationId
											? t("pricing.choosePlan")
											: t("pricing.getStarted")}
										<ArrowRightIcon className="ml-2 size-4" />
									</Button>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

/**
 * Shows the price in the alternative currency as a small hint below the main price.
 * E.g. if displaying RUB, shows "≈ $X" or vice versa.
 */
function AlternativePriceHint({
	prices,
	displayCurrency,
	interval,
	format,
}: {
	prices: PaidPlan["prices"];
	displayCurrency: string;
	interval: "month" | "year";
	format: ReturnType<typeof useFormatter>;
}) {
	const altPrice = prices.find(
		(p) => (p.type === "one-time" || p.interval === interval) && p.currency !== displayCurrency,
	);

	if (!altPrice) return null;

	return (
		<span className="mt-0.5 text-xs block text-muted-foreground">
			≈{" "}
			{format.number(altPrice.amount, {
				style: "currency",
				currency: altPrice.currency,
			})}
			{altPrice.type === "subscription" && (
				<>
					{" / "}
					{altPrice.interval === "month" ? "mo" : "yr"}
				</>
			)}
		</span>
	);
}
