"use client";

import { usePlanData } from "@payments/hooks/plan-data";
import { usePurchases } from "@payments/hooks/purchases";
import { logger } from "@repo/logs";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Skeleton } from "@repo/ui/components/skeleton";
import { SettingsItem } from "@shared/components/SettingsItem";
import { useRouter } from "@shared/hooks/router";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	ArrowRightIcon,
	BadgeCheckIcon,
	CheckIcon,
	CreditCardIcon,
	ExternalLinkIcon,
	Loader2Icon,
	MinusIcon,
	SearchIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlanDataEntry {
	title: string;
	description: ReactNode;
	features: ReactNode[];
}

// ─── Main component ──────────────────────────────────────────────────────────

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
	const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

	const hasActiveSubscription = !!activePlan && !!activePlanId;

	// ── Proration preview ──────────────────────────────────────────────────

	const {
		data: prorationPreview,
		isLoading: prorationLoading,
		error: prorationError,
	} = useQuery({
		...orpc.payments.getProrationPreview.queryOptions({
			input: {
				newPlanId: selectedPlanId ?? "",
				organizationId,
			},
		}),
		enabled: Boolean(selectedPlanId) && dialogOpen,
		retry: false,
	});

	// ── Upgrade session (Stripe Checkout) ──────────────────────────────────

	const createSessionMutation = useMutation(
		orpc.payments.createUpgradeSession.mutationOptions({
			onSuccess: (result) => {
				if (result.type === "stripe_checkout" && result.url) {
					logger.info("Redirecting to Stripe Checkout", { url: result.url });
					window.location.href = result.url;
				} else if (result.type === "direct_update" && result.success) {
					logger.info("Direct upgrade succeeded");
					setDialogOpen(false);
					setSelectedPlanId(null);
					router.refresh();
				}
			},
			onError: (error) => {
				logger.error("Failed to create upgrade session", { error });
			},
		}),
	);

	// ── Direct upgrade (no payment needed) ─────────────────────────────────

	const upgradeMutation = useMutation(
		orpc.payments.upgradeSubscription.mutationOptions({
			onSuccess: () => {
				logger.info("Subscription upgraded successfully");
				setDialogOpen(false);
				setSelectedPlanId(null);
				router.refresh();
			},
			onError: (error) => {
				logger.error("Failed to upgrade subscription", { error });
			},
		}),
	);

	// ── Handle confirm upgrade ─────────────────────────────────────────────

	const handleUpgrade = useCallback(async () => {
		if (!selectedPlanId) return;

		try {
			// First try direct upgrade
			await upgradeMutation.mutateAsync({
				newPlanId: selectedPlanId,
				organizationId,
			});
		} catch (directError) {
			// If direct upgrade fails (e.g. needs payment), try Stripe session
			logger.info("Direct upgrade failed, trying Stripe Checkout", {
				error: directError,
			});
			try {
				await createSessionMutation.mutateAsync({
					newPlanId: selectedPlanId,
					organizationId,
					returnUrl: `${window.location.origin}/${organizationId ? window.location.pathname.split("/")[1] : ""}/settings/billing`,
				});
			} catch (sessionError) {
				logger.error("Both upgrade methods failed", {
					directError,
					sessionError,
				});
			}
		}
	}, [selectedPlanId, upgradeMutation, createSessionMutation, organizationId]);

	const isPending = upgradeMutation.isPending || createSessionMutation.isPending;
	const error = upgradeMutation.error || createSessionMutation.error || prorationError;

	// ── Get active plan price ──────────────────────────────────────────────

	const activePlanPrice =
		activePlan && "price" in activePlan
			? (activePlan.price as {
					amount: number;
					currency: string;
					interval?: string;
				})
			: null;

	// ── Get all plans with their data for the comparison table ─────────────

	const allPlans = useMemo(() => {
		const planIds = Object.keys(planData).filter(
			(id) => id !== "lifetime" && id !== "enterprise",
		);
		// Keep a defined order
		const order = ["free", "starter", "pro", "business"];
		return order
			.filter((id) => planIds.includes(id))
			.map((id) => ({
				id,
				...planData[id],
				isActive: id === activePlanId,
				isSelected: id === selectedPlanId,
				isRecommended: id === "pro",
			}));
	}, [planData, activePlanId, selectedPlanId]);

	// ── Render ─────────────────────────────────────────────────────────────

	// No active subscription → show PricingTable directly
	if (!hasActiveSubscription) {
		return null;
	}

	return (
		<SettingsItem
			title={t("settings.billing.changePlan.title")}
			description={t("settings.billing.changePlan.description")}
		>
			<Dialog
				open={dialogOpen}
				onOpenChange={(open) => {
					setDialogOpen(open);
					if (!open) {
						setSelectedPlanId(null);
					}
				}}
			>
				<DialogTrigger asChild>
					<Button variant="primary">{t("settings.billing.upgradePlan")}</Button>
				</DialogTrigger>
				<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{t("settings.billing.upgradeModal.title")}</DialogTitle>
						<DialogDescription>
							{t("settings.billing.upgradeModal.currentPlan")}:{" "}
							<strong>
								{planData[activePlanId as keyof typeof planData]?.title ??
									activePlanId}
							</strong>
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

					{/* Plan comparison table */}
					<div className="mt-4 space-y-4">
						<h4 className="text-sm font-semibold text-muted-foreground">
							{t("settings.billing.upgradeModal.comparePlans")}
						</h4>
						<PlanComparisonTable
							plans={allPlans}
							selectedPlanId={selectedPlanId}
							onSelectPlan={setSelectedPlanId}
							t={t}
							format={format}
						/>
					</div>

					{/* Proration preview */}
					{selectedPlanId && selectedPlanId !== activePlanId && (
						<div className="mt-4 space-y-3">
							<h4 className="text-sm font-semibold text-muted-foreground">
								{t("settings.billing.upgradeModal.prorationPreview")}
							</h4>
							<ProrationPreviewCard
								preview={prorationPreview ?? null}
								isLoading={prorationLoading}
								t={t}
								format={format}
							/>
						</div>
					)}

					{/* Error state */}
					{error && (
						<div className="mt-2 p-3 text-sm rounded-md bg-destructive/10 text-destructive">
							{error instanceof Error
								? error.message
								: t("settings.billing.upgradeModal.upgradeError")}
						</div>
					)}

					{/* Action buttons */}
					<div className="mt-6 gap-3 flex justify-end">
						<Button
							variant="outline"
							onClick={() => setDialogOpen(false)}
							disabled={isPending}
						>
							\t\t\t\t\t\t\t{t("common.confirmation.cancel")}
						</Button>
						<Button
							variant="primary"
							onClick={handleUpgrade}
							disabled={
								!selectedPlanId ||
								selectedPlanId === activePlanId ||
								isPending ||
								prorationLoading
							}
							loading={isPending}
						>
							{isPending
								? t("settings.billing.upgradeModal.redirectingToStripe")
								: t("settings.billing.upgradeModal.confirmUpgrade")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</SettingsItem>
	);
}

// ─── Plan Comparison Table ──────────────────────────────────────────────────

interface PlanComparisonTableProps {
	plans: Array<
		PlanDataEntry & {
			id: string;
			isActive: boolean;
			isSelected: boolean;
			isRecommended: boolean;
		}
	>;
	selectedPlanId: string | null;
	onSelectPlan: (planId: string | null) => void;
	t: (key: string, ...args: unknown[]) => string;
	format: ReturnType<typeof useFormatter>;
}

function PlanComparisonTable({
	plans,
	selectedPlanId,
	onSelectPlan,
	t,
	format,
}: PlanComparisonTableProps) {
	// Collect all unique features across all plans
	const allFeatures = useMemo(() => {
		const featureSet = new Set<string>();
		for (const plan of plans) {
			for (const feature of plan.features) {
				featureSet.add(feature);
			}
		}
		return Array.from(featureSet);
	}, [plans]);

	return (
		<div className="overflow-x-auto">
			<table className="text-sm w-full border-collapse">
				<thead>
					<tr>
						<th className="px-3 py-2 font-medium w-1/4 text-left text-muted-foreground">
							{t("settings.billing.upgradeModal.feature")}
						</th>
						{plans.map((plan) => (
							<th
								key={plan.id}
								className={`px-3 py-2 font-medium relative text-center ${plan.isRecommended ? "bg-primary/5" : ""} ${plan.isSelected ? "bg-primary/10 ring-2 ring-primary ring-inset" : ""} `}
							>
								<div className="gap-1 flex flex-col items-center">
									{plan.isRecommended && (
										<Badge status="info" className="mb-1 text-[10px]">
											{t("pricing.recommended")}
										</Badge>
									)}
									<span className="font-semibold text-sm">{plan.title}</span>
									{plan.isActive && (
										<span className="text-[10px] text-muted-foreground">
											{t("settings.billing.upgradeModal.current")}
										</span>
									)}
								</div>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{allFeatures.map((feature, idx) => (
						<tr
							key={feature}
							className={
								idx % 2 === 0
									? "border-b border-muted/30"
									: "border-b border-muted/30 bg-muted/20"
							}
						>
							<td className="px-3 py-2.5 text-xs text-muted-foreground">{feature}</td>
							{plans.map((plan) => {
								const hasFeature = plan.features.includes(feature);
								return (
									<td
										key={plan.id}
										className={`px-3 py-2.5 text-center ${plan.isRecommended ? "bg-primary/5" : ""} ${plan.isSelected ? "bg-primary/10" : ""} `}
									>
										{hasFeature ? (
											<CheckIcon className="size-4 mx-auto text-primary" />
										) : (
											<MinusIcon className="size-4 mx-auto text-muted-foreground/30" />
										)}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
				<tfoot>
					<tr>
						<td className="px-3 py-3" />
						{plans.map((plan) => (
							<td
								key={plan.id}
								className={`px-3 py-3 text-center ${plan.isRecommended ? "bg-primary/5" : ""} ${plan.isSelected ? "bg-primary/10" : ""} `}
							>
								<Button
									variant={selectedPlanId === plan.id ? "primary" : "outline"}
									size="sm"
									onClick={() =>
										onSelectPlan(selectedPlanId === plan.id ? null : plan.id)
									}
									disabled={plan.isActive}
									className="w-full"
								>
									{plan.isActive
										? t("settings.billing.upgradeModal.current")
										: selectedPlanId === plan.id
											? t("common.selected")
											: t("settings.billing.upgradeModal.select")}
								</Button>
							</td>
						))}
					</tr>
				</tfoot>
			</table>
		</div>
	);
}

// ─── Proration Preview Card ─────────────────────────────────────────────────

interface ProrationPreviewCardProps {
	preview: {
		immediateAmount: number;
		currency: string;
		nextInvoiceAmount: number | null;
		creditAmount: number;
	} | null;
	isLoading: boolean;
	t: (key: string, ...args: unknown[]) => string;
	format: ReturnType<typeof useFormatter>;
}

function ProrationPreviewCard({ preview, isLoading, t, format }: ProrationPreviewCardProps) {
	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-4 space-y-3">
					{[...Array(3)].map((_, i) => (
						<Skeleton key={i} className="h-5 rounded w-full" />
					))}
				</CardContent>
			</Card>
		);
	}

	if (!preview) {
		return (
			<Card>
				<CardContent className="p-4">
					<div className="gap-3 py-4 flex items-center justify-center">
						<Loader2Icon className="size-5 animate-spin text-muted-foreground" />
						<p className="text-sm text-muted-foreground">{t("common.loading")}</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const { immediateAmount, currency, nextInvoiceAmount, creditAmount } = preview;
	const currencyFormat = { style: "currency" as const, currency };

	return (
		<Card>
			<CardContent className="p-4 space-y-3">
				<div className="gap-4 flex items-start justify-between">
					<div className="gap-2 text-sm flex items-center">
						<CreditCardIcon className="size-4 shrink-0 text-muted-foreground" />
						<span>{t("settings.billing.upgradeModal.currentRemaining")}</span>
					</div>
					<span className="text-sm font-medium text-green-600 dark:text-green-400">
						-{format.number(creditAmount, currencyFormat)}
					</span>
				</div>

				<div className="gap-4 flex items-start justify-between">
					<div className="gap-2 text-sm flex items-center">
						<ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
						<span>{t("settings.billing.upgradeModal.newPlanCost")}</span>
					</div>
					<span className="text-sm font-medium">
						+{format.number(immediateAmount + creditAmount, currencyFormat)}
					</span>
				</div>

				<div className="pt-3 border-t border-border">
					<div className="gap-4 flex items-start justify-between">
						<div className="gap-2 text-sm font-semibold flex items-center">
							<BadgeCheckIcon className="size-4 shrink-0" />
							<span>
								{immediateAmount > 0
									? t("settings.billing.upgradeModal.totalDueToday")
									: t("settings.billing.upgradeModal.totalCredit")}
							</span>
						</div>
						<span
							className={`text-sm font-bold ${
								immediateAmount > 0
									? "text-foreground"
									: "text-green-600 dark:text-green-400"
							}`}
						>
							{format.number(Math.abs(immediateAmount), currencyFormat)}
							{immediateAmount <= 0 && (
								<span className="ml-1 text-xs font-normal text-green-600 dark:text-green-400">
									{t("settings.billing.upgradeModal.noPaymentNeeded")}
								</span>
							)}
						</span>
					</div>
				</div>

				{nextInvoiceAmount && nextInvoiceAmount > 0 && (
					<div className="text-xs pt-1 text-muted-foreground">
						{t("pricing.nextInvoice")}:{" "}
						{format.number(nextInvoiceAmount, currencyFormat)} /{" "}
						{nextInvoiceAmount === immediateAmount + creditAmount
							? t("pricing.month", { count: 1 })
							: t("pricing.month", { count: 1 })}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
