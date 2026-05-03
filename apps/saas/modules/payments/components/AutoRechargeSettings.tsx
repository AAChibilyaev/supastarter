"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useAiWallet } from "../hooks/ai-wallet";

export function AutoRechargeSettings() {
	const t = useTranslations("settings.billing");
	const { activeOrganization } = useActiveOrganization();
	const orgId = activeOrganization?.id;

	const { data: wallet, isLoading } = useAiWallet(orgId);
	const qc = useQueryClient();

	const isEnabled = wallet?.autoRechargeEnabled ?? false;

	const [thresholdInput, setThresholdInput] = useState("");
	const [topupInput, setTopupInput] = useState("");

	const setupMutation = useMutation(
		orpc.billingWallet.setupAutorecharge.mutationOptions({
			onSuccess: (data) => {
				toast.success(t("autoRecharge.setupSuccess"));
				if (data.paymentUrl) {
					window.open(data.paymentUrl, "_blank");
				}
				void qc.invalidateQueries({ queryKey: ["billingWallet"] });
			},
			onError: (error) => {
				toast.error(error.message || t("autoRecharge.setupError"));
			},
		}),
	);

	const disableMutation = useMutation(
		orpc.billingWallet.setupAutorecharge.mutationOptions({
			onSuccess: () => {
				toast.success(t("autoRecharge.disabled"));
				void qc.invalidateQueries({ queryKey: ["billingWallet"] });
			},
			onError: (error) => {
				toast.error(error.message || t("autoRecharge.setupError"));
			},
		}),
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const thresholdKopecks = BigInt(Math.round(parseFloat(thresholdInput || "0") * 100));
		const topupAmountKopecks = BigInt(Math.round(parseFloat(topupInput || "0") * 100));

		if (thresholdKopecks <= BigInt(0) || topupAmountKopecks < BigInt(100)) {
			toast.error(t("autoRecharge.invalidValues"));
			return;
		}

		setupMutation.mutate({
			thresholdKopecks,
			topupAmountKopecks,
			enabled: true,
		});
	};

	const handleDisable = () => {
		disableMutation.mutate({
			thresholdKopecks: BigInt(0),
			topupAmountKopecks: BigInt(0),
			enabled: false,
		});
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("autoRecharge.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-9 w-32" />
				</CardContent>
			</Card>
		);
	}

	if (!wallet) return null;

	// Show status when auto-recharge is already configured
	if (isEnabled) {
		const thresholdRub = (Number(wallet.autoRechargeThresholdKopecks) / 100).toFixed(2);
		const topupRub = (Number(wallet.autoRechargeAmountKopecks) / 100).toFixed(2);

		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("autoRecharge.title")}</CardTitle>
					<CardDescription>{t("autoRecharge.statusActive")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">
							{t("autoRecharge.thresholdLabel")}
						</span>
						<span className="font-medium">{thresholdRub} RUB</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">
							{t("autoRecharge.topupLabel")}
						</span>
						<span className="font-medium">{topupRub} RUB</span>
					</div>
				</CardContent>
				<CardFooter>
					<Button
						variant="outline"
						onClick={handleDisable}
						disabled={disableMutation.isPending}
					>
						{disableMutation.isPending
							? t("autoRecharge.disabling")
							: t("autoRecharge.disable")}
					</Button>
				</CardFooter>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("autoRecharge.title")}</CardTitle>
				<CardDescription>{t("autoRecharge.description")}</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="threshold">{t("autoRecharge.thresholdLabel")}</Label>
						<div className="gap-2 flex items-center">
							<Input
								id="threshold"
								type="number"
								step="0.01"
								min="0"
								placeholder={t("autoRecharge.thresholdPlaceholder")}
								value={thresholdInput}
								onChange={(e) => setThresholdInput(e.target.value)}
							/>
							<span className="text-sm text-muted-foreground">
								{t("autoRecharge.rub")}
							</span>
						</div>
						<p className="text-xs text-muted-foreground">
							{t("autoRecharge.thresholdHint")}
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="topupAmount">{t("autoRecharge.topupLabel")}</Label>
						<div className="gap-2 flex items-center">
							<Input
								id="topupAmount"
								type="number"
								step="0.01"
								min="1"
								placeholder={t("autoRecharge.topupPlaceholder")}
								value={topupInput}
								onChange={(e) => setTopupInput(e.target.value)}
							/>
							<span className="text-sm text-muted-foreground">
								{t("autoRecharge.rub")}
							</span>
						</div>
						<p className="text-xs text-muted-foreground">
							{t("autoRecharge.topupHint")}
						</p>
					</div>

					<Button type="submit" disabled={setupMutation.isPending} variant="primary">
						{setupMutation.isPending
							? t("autoRecharge.saving")
							: t("autoRecharge.submit")}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
