"use client";

import { usePlanData } from "@payments/hooks/plan-data";
import { usePurchases } from "@payments/hooks/purchases";
import { logger } from "@repo/logs";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
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
	AlertTriangleIcon,
	ArrowRightIcon,
	BadgeCheckIcon,
	CheckIcon,
	CreditCardIcon,
	Loader2Icon,
	MinusIcon,
	XIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

// ─── Plan tier order ────────────────────────────────────────────────────────

const PLAN_TIER_ORDER = ["free", "starter", "pro", "business", "enterprise"];

function getPlanTier(planId?: string): number {
	const idx = PLAN_TIER_ORDER.indexOf(planId ?? "");
	return idx >= 0 ? idx : -1;
}

function isDowngrade(activePlanId?: string, selectedPlanId?: string): boolean {
	if (!activePlanId || !selectedPlanId) return false;
	return getPlanTier(selectedPlanId) < getPlanTier(activePlanId);
}

// ─── Plan definitions for comparison (mirrors entitlements.ts) ──────────────

interface PlanDef {
	name: string;
	limits: Record<string, number>;
	features: Record<string, boolean | string>;
}

const PLAN_DEFS: Record<string, PlanDef> = {
	free: {
		name: "Free",
		limits: {
			maxIndexes: 1,
			maxDocuments: 500,
			maxSearchesPerMonth: 1_000,
			maxApiKeys: 5,
			rateLimitPerMinute: 60,
		},
		features: {
			synonyms: false,
			curations: false,
			analytics: "basic",
			customDomain: false,
			customBranding: false,
			multiSearch: true,
			scopedTokens: false,
			widget: true,
		},
	},
	starter: {
		name: "Starter",
		limits: {
			maxIndexes: 3,
			maxDocuments: 10_000,
			maxSearchesPerMonth: 50_000,
			maxApiKeys: 20,
			rateLimitPerMinute: 600,
		},
		features: {
			synonyms: false,
			curations: false,
			analytics: "full",
			customDomain: true,
			customBranding: false,
			multiSearch: true,
			scopedTokens: true,
			widget: true,
		},
	},
	pro: {
		name: "Pro",
		limits: {
			maxIndexes: 10,
			maxDocuments: 100_000,
			maxSearchesPerMonth: 500_000,
			maxApiKeys: 100,
			rateLimitPerMinute: 6_000,
		},
		features: {
			synonyms: true,
			curations: true,
			analytics: "full",
			customDomain: true,
			customBranding: true,
			multiSearch: true,
			scopedTokens: true,
			widget: true,
		},
	},
	business: {
		name: "Business",
		limits: {
			maxIndexes: 50,
			maxDocuments: 1_000_000,
			maxSearchesPerMonth: -1,
			maxApiKeys: 500,
			rateLimitPerMinute: 60_000,
		},
		features: {
			synonyms: true,
			curations: true,
			analytics: "full",
			customDomain: true,
			customBranding: true,
			multiSearch: true,
			scopedTokens: true,
			widget: true,
		},
	},
	enterprise: {
		name: "Enterprise",
		limits: {
			maxIndexes: -1,
			maxDocuments: -1,
			maxSearchesPerMonth: -1,
			maxApiKeys: -1,
			rateLimitPerMinute: -1,
		},
		features: {
			synonyms: true,
			curations: true,
			analytics: "full",
			customDomain: true,
			customBranding: true,
			multiSearch: true,
			scopedTokens: true,
			widget: true,
		},
	},
};

const LIMIT_LABEL_KEYS: Record<string, string> = {
	maxIndexes: "settings.billing.limits.maxIndexes",
	maxDocuments: "settings.billing.limits.maxDocuments",
	maxSearchesPerMonth: "settings.billing.limits.maxSearchesPerMonth",
	maxApiKeys: "settings.billing.limits.maxApiKeys",
	rateLimitPerMinute: "settings.billing.limits.rateLimit",
};

const FEATURE_LABEL_KEYS: Record<string, string> = {
	synonyms: "pricing.synonyms",
	curations: "pricing.curations",
	customDomain: "pricing.customDomain",
	customBranding: "pricing.customBranding",
	multiSearch: "pricing.multiSearch",
	scopedTokens: "pricing.scopedTokens",
	widget: "pricing.widget",
};

function formatLimitValue(value: number): string {
	if (value < 0) return "∞";
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
	return value.toLocaleString();
}

function getLimitChanges(
	activePlanId: string,
	selectedPlanId: string,
): Array<{ key: string; from: number; to: number }> {
	const activeDef = PLAN_DEFS[activePlanId];
	const targetDef = PLAN_DEFS[selectedPlanId];
	if (!activeDef || !targetDef) return [];

	return Object.keys(activeDef.limits)
		.filter((key) => targetDef.limits[key] !== activeDef.limits[key])
		.map((key) => ({
			key,
			from: activeDef.limits[key],
			to: targetDef.limits[key],
		}));
}

function getDisabledFeatures(
	activePlanId: string,
	selectedPlanId: string,
): Array<{ key: string; wasEnabled: boolean }> {
	const activeDef = PLAN_DEFS[activePlanId];
	const targetDef = PLAN_DEFS[selectedPlanId];
	if (!activeDef || !targetDef) return [];

	const disabled: Array<{ key: string; wasEnabled: boolean }> = [];
	for (const [key, value] of Object.entries(targetDef.features)) {
		const activeValue = activeDef.features[key];
		if (typeof value === "boolean" && typeof activeValue === "boolean") {
			if (activeValue && !value) {
				disabled.push({ key, wasEnabled: activeValue });
			}
		} else if (typeof value === "string" && typeof activeValue === "string") {
			// Handle analytics levels: "none" < "basic" < "full"
			const levels = ["none", "basic", "full"];
			const activeLevel = levels.indexOf(activeValue);
			const targetLevel = levels.indexOf(value);
			if (activeLevel > targetLevel) {
				disabled.push({ key, wasEnabled: true });
			}
		}
	}
	return disabled;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlanDataEntry {
	title: string;
	description: ReactNode;
	features: ReactNode[];
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ChangePlan({
	organizationId,
	_userId,
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
	const { activePlan } = usePurchases(organizationId);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
	const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false);

	const hasActiveSubscription = !!activePlan && !!activePlanId;

	// Determine if selected plan is a downgrade
	const isSelectedDowngrade = isDowngrade(activePlanId, selectedPlanId ?? undefined);

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
				if (result.type === "checkout" && result.url) {
					logger.info("Redirecting to Stripe Checkout", { url: result.url });
					window.location.href = result.url;
				} else if (result.type === "direct_update" && result.success) {
					logger.info("Direct upgrade succeeded");
					setDialogOpen(false);
					setDowngradeDialogOpen(false);
					setSelectedPlanId(null);
					router.refresh();
				}
			},
			onError: (error) => {
				logger.error("Failed to create upgrade session", { error });
			},
		}),
	);

	// ── Handle confirm upgrade ─────────────────────────────────────────────

	const handleUpgrade = useCallback(async () => {
		if (!selectedPlanId) return;

		try {
			await createSessionMutation.mutateAsync({
				newPlanId: selectedPlanId,
				organizationId,
				returnUrl: `${window.location.origin}/${organizationId ? window.location.pathname.split("/")[1] : ""}/settings/billing`,
			});
		} catch (sessionError) {
			logger.error("Upgrade session creation failed", {
				sessionError,
			});
		}
	}, [selectedPlanId, createSessionMutation, organizationId]);

	// ── Handle confirm downgrade ───────────────────────────────────────────

	const handleDowngrade = useCallback(async () => {
		if (!selectedPlanId) return;

		try {
			await createSessionMutation.mutateAsync({
				newPlanId: selectedPlanId,
				organizationId,
				returnUrl: `${window.location.origin}/${organizationId ? window.location.pathname.split("/")[1] : ""}/settings/billing`,
			});
		} catch (sessionError) {
			logger.error("Downgrade session creation failed", {
				sessionError,
			});
		}
	}, [selectedPlanId, createSessionMutation, organizationId]);

	// ── Handle plan selection from comparison table ────────────────────────

	const handleSelectPlan = useCallback(
		(planId: string | null) => {
			setSelectedPlanId(planId);
			if (planId && activePlanId && isDowngrade(activePlanId, planId)) {
				setDowngradeDialogOpen(true);
			}
		},
		[activePlanId],
	);

	const isPending = createSessionMutation.isPending;
	const error = createSessionMutation.error || prorationError;

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

	// ── Compute limit changes and disabled features for downgrade ─────────

	const limitChanges = useMemo(() => {
		if (!activePlanId || !selectedPlanId) return [];
		return getLimitChanges(activePlanId, selectedPlanId);
	}, [activePlanId, selectedPlanId]);

	const disabledFeatures = useMemo(() => {
		if (!activePlanId || !selectedPlanId) return [];
		return getDisabledFeatures(activePlanId, selectedPlanId);
	}, [activePlanId, selectedPlanId]);

	// ── Inline helper for limit change labels ──────────────────────────────

	const limitLabel = useCallback(
		(limitKey: string) => {
			const key = LIMIT_LABEL_KEYS[limitKey] as keyof ReturnType<typeof useTranslations>;
			const label = t(key);
			// Fallback to the key name if translation not found
			return label ?? limitKey;
		},
		[t],
	);

	const featureLabel = useCallback(
		(featureKey: string) => {
			const key = FEATURE_LABEL_KEYS[featureKey] as keyof ReturnType<typeof useTranslations>;
			const label = t(key);
			return label ?? featureKey;
		},
		[t],
	);

	// ── Render ─────────────────────────────────────────────────────────────

	if (!hasActiveSubscription) {
		return null;
	}

	return (
		<>
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
							setDowngradeDialogOpen(false);
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
								onSelectPlan={handleSelectPlan}
								t={t}
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
						{selectedPlanId && selectedPlanId !== activePlanId && (
							<div className="mt-6 gap-3 flex justify-end">
								<Button
									variant="outline"
									onClick={() => setDialogOpen(false)}
									disabled={isPending}
								>
									{t("common.confirmation.cancel")}
								</Button>
								<Button
									variant="primary"
									onClick={isSelectedDowngrade ? handleDowngrade : handleUpgrade}
									disabled={
										!selectedPlanId ||
										selectedPlanId === activePlanId ||
										isPending ||
										prorationLoading
									}
									loading={isPending}
								>
									{isPending
										? isSelectedDowngrade
											? t(
													"settings.billing.downgradeModal.downgradeProcessing",
												)
											: t("settings.billing.upgradeModal.redirectingToStripe")
										: isSelectedDowngrade
											? t("settings.billing.downgradeModal.confirmDowngrade")
											: t("settings.billing.upgradeModal.confirmUpgrade")}
								</Button>
							</div>
						)}
					</DialogContent>
				</Dialog>
			</SettingsItem>

			{/* Downgrade confirmation dialog */}
			<AlertDialog
				open={downgradeDialogOpen}
				onOpenChange={(open) => {
					setDowngradeDialogOpen(open);
					if (!open && !isPending) {
						setSelectedPlanId(null);
					}
				}}
			>
				<AlertDialogContent className="max-w-lg">
					<AlertDialogHeader>
						<div className="gap-2 flex items-center">
							<AlertTriangleIcon className="size-5 text-destructive" />
							<AlertDialogTitle>
								{t("settings.billing.downgradeModal.warningTitle")}
							</AlertDialogTitle>
						</div>
						<AlertDialogDescription>
							{t("settings.billing.downgradeModal.dataLossWarning")}
						</AlertDialogDescription>
					</AlertDialogHeader>

					{/* Proration credit */}
					{prorationPreview && prorationPreview.creditAmount > 0 && (
						<div className="p-3 text-sm gap-2 flex items-center rounded-lg border border-border bg-muted/30">
							<CreditCardIcon className="size-4 shrink-0 text-muted-foreground" />
							<span>
								{t("settings.billing.downgradeModal.prorationCredit", {
									amount: format.number(prorationPreview.creditAmount, {
										style: "currency",
										currency: prorationPreview.currency,
									}),
								})}
							</span>
						</div>
					)}

					{/* Limit changes */}
					{limitChanges.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm font-semibold">
								{t("settings.billing.downgradeModal.limitChanges")}
							</h4>
							<div className="overflow-hidden rounded-lg border border-border">
								<table className="text-sm w-full">
									<thead>
										<tr className="bg-muted/50">
											<th className="px-3 py-2 font-medium text-left text-muted-foreground">
												{t("settings.billing.downgradeModal.whatChanges")}
											</th>
											<th className="px-3 py-2 font-medium text-right text-muted-foreground">
												{t("settings.billing.downgradeModal.currentLimit")}
											</th>
											<th className="px-3 py-2 font-medium text-right text-muted-foreground">
												{t("settings.billing.downgradeModal.newLimit")}
											</th>
										</tr>
									</thead>
									<tbody>
										{limitChanges.map((change) => (
											<tr key={change.key} className="border-t border-border">
												<td className="px-3 py-2 text-muted-foreground">
													{limitLabel(change.key)}
												</td>
												<td className="px-3 py-2 font-medium text-right">
													{formatLimitValue(change.from)}
												</td>
												<td className="px-3 py-2 font-medium text-right text-destructive">
													{formatLimitValue(change.to)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Feature downgrades */}
					{disabledFeatures.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm font-semibold">
								{t("settings.billing.downgradeModal.featureDowngrades")}
							</h4>
							<div className="gap-2 flex flex-wrap">
								{disabledFeatures.map((feature) => (
									<Badge
										key={feature.key}
										status="error"
										className="gap-1 text-xs"
									>
										<XIcon className="size-3" />
										{featureLabel(feature.key)}
									</Badge>
								))}
							</div>
						</div>
					)}

					{/* Grace period notice */}
					<div className="p-3 text-xs rounded-lg border border-border bg-muted text-muted-foreground">
						{t("settings.billing.downgradeModal.gracePeriod")}
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>
							{t("settings.billing.downgradeModal.cancelDowngrade")}
						</AlertDialogCancel>
						<AlertDialogAction asChild>
							<Button
								variant="destructive"
								onClick={handleDowngrade}
								disabled={isPending}
								loading={isPending}
							>
								{isPending
									? t("settings.billing.downgradeModal.downgradeProcessing")
									: t("settings.billing.downgradeModal.confirmDowngrade")}
							</Button>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
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
	t: ReturnType<typeof useTranslations>;
}

function PlanComparisonTable({
	plans,
	selectedPlanId,
	onSelectPlan,
	t,
	_format,
}: PlanComparisonTableProps) {
	const allFeatures = useMemo(() => {
		const featureSet = new Set<string>();
		for (const plan of plans) {
			for (const feature of plan.features) {
				if (typeof feature === "string") {
					featureSet.add(feature);
				}
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
								className={`px-3 py-2 font-medium relative text-center ${plan.isRecommended ? "bg-primary/5" : ""} ${plan.isSelected ? "bg-primary/10 ring-2 ring-primary ring-inset" : ""}`}
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
								const hasFeature = (plan.features as string[]).includes(feature);
								return (
									<td
										key={plan.id}
										className={`px-3 py-2.5 text-center ${plan.isRecommended ? "bg-primary/5" : ""} ${plan.isSelected ? "bg-primary/10" : ""}`}
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
								className={`px-3 py-3 text-center ${plan.isRecommended ? "bg-primary/5" : ""} ${plan.isSelected ? "bg-primary/10" : ""}`}
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
	t: ReturnType<typeof useTranslations>;
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
