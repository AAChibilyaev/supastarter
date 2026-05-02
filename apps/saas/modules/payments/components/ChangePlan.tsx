"use client";

import { PricingTable } from "@payments/components/PricingTable";
import { usePlanData } from "@payments/hooks/plan-data";
import { usePurchases } from "@payments/hooks/purchases";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { SettingsItem } from "@shared/components/SettingsItem";
import { useRouter } from "@shared/hooks/router";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheckIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

export function ChangePlan({
	organizationId,
	userId,
	activePlanId,
}: {
	organizationId?: string;
	userId?: string;
	activePlanId?: string;
}) {
	const t = useTranslations();
	const format = useFormatter();
	const router = useRouter();
	const { planData } = usePlanData();
	const { purchases, activePlan } = usePurchases(organizationId);
	const [dialogOpen, setDialogOpen] = useState(false);

	const hasActiveSubscription = !!activePlan && !!activePlanId;

	const upgradeMutation = useMutation(orpc.payments.upgradeSubscription.mutationOptions());

	const handleUpgrade = async (newPlanId: string) => {
		try {
			await upgradeMutation.mutateAsync({
				newPlanId,
				organizationId,
			});
			setDialogOpen(false);
			router.refresh();
		} catch {
			// Error state handled by mutation
		}
	};

	// If user has no active subscription, render PricingTable directly
	if (!hasActiveSubscription) {
		return (
			<SettingsItem
				title={t("settings.billing.changePlan.title")}
				description={t("settings.billing.changePlan.description")}
			>
				<PricingTable
					organizationId={organizationId}
					userId={userId}
					activePlanId={activePlanId}
				/>
			</SettingsItem>
		);
	}

	// Get current active plan data for the dialog
	const activePlanData = planData[activePlanId as keyof typeof planData];
	const activePlanPrice =
		"price" in activePlan
			? (activePlan.price as { amount: number; currency: string; interval?: string })
			: null;

	// Get upgrade target plans (exclude current plan)
	const upgradePlans = Object.entries(planData).filter(([planId]) => planId !== activePlanId);

	return (
		<SettingsItem
			title={t("settings.billing.changePlan.title")}
			description={t("settings.billing.changePlan.description")}
		>
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogTrigger asChild>
					<Button variant="primary">{t("settings.billing.upgradePlan")}</Button>
				</DialogTrigger>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>{t("settings.billing.upgradePlan")}</DialogTitle>
						<DialogDescription>
							{t("settings.billing.currentPlan")}:{" "}
							<strong>{activePlanData?.title ?? activePlanId}</strong>
							{activePlanPrice && (
								<span className="ml-1 text-muted-foreground">
									{format.number(activePlanPrice.amount, {
										style: "currency",
										currency: activePlanPrice.currency,
									})}
									{activePlanPrice.interval === "month"
										? ` / ${t("pricing.month", { count: 1 })}`
										: activePlanPrice.interval === "year"
											? ` / ${t("pricing.year", { count: 1 })}`
											: ""}
								</span>
							)}
						</DialogDescription>
					</DialogHeader>

					<div className="mt-2 space-y-3">
						{upgradePlans.map(([planId, plan]) => {
							const data = planData[planId as keyof typeof planData];
							if (!data) return null;

							const prices =
								"prices" in plan
									? (
											plan as {
												prices: Array<{
													amount: number;
													currency: string;
													type: string;
													interval?: string;
												}>;
											}
										).prices
									: [];
							const price = prices.find(
								(p) => p.type === "subscription" && p.currency === "USD",
							);

							return (
								<div
									key={planId}
									className="p-4 flex items-center justify-between rounded-lg border"
								>
									<div className="gap-3 flex items-center">
										<BadgeCheckIcon className="size-5 text-primary" />
										<div>
											<div className="font-semibold">{data.title}</div>
											{data.description && (
												<div className="text-sm text-muted-foreground">
													{data.description}
												</div>
											)}
										</div>
									</div>
									<div className="gap-3 flex items-center">
										{price && (
											<div className="text-right">
												<div className="font-semibold">
													{format.number(price.amount, {
														style: "currency",
														currency: price.currency,
													})}
												</div>
												{price.interval && (
													<div className="text-xs text-muted-foreground">
														/
														{price.interval === "month"
															? t("pricing.month", { count: 1 })
															: t("pricing.year", { count: 1 })}
													</div>
												)}
											</div>
										)}
										<Button
											variant="primary"
											size="sm"
											onClick={() => handleUpgrade(planId)}
											loading={upgradeMutation.isPending}
										>
											{t("settings.billing.upgradePlan")}
										</Button>
									</div>
								</div>
							);
						})}
					</div>

					{upgradeMutation.isError && (
						<div className="mt-2 p-3 text-sm rounded-md bg-destructive/10 text-destructive">
							{upgradeMutation.error?.message ?? "Failed to upgrade plan"}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</SettingsItem>
	);
}
