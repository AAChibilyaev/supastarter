"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useTranslations } from "next-intl";

import { useAiWallet } from "../hooks/ai-wallet";
import { formatKopecks } from "../lib/format-kopecks";

export function AiWalletCard({ organizationId }: { organizationId?: string }) {
	const t = useTranslations();
	const { data: wallet, isLoading } = useAiWallet(organizationId);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.billing.aiCredits.balance.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-9 w-32" />
					<Skeleton className="mt-2 h-4 w-48" />
				</CardContent>
			</Card>
		);
	}

	if (!wallet) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.billing.aiCredits.balance.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-foreground/60 text-sm">
						{t("settings.billing.aiCredits.balance.notInitialized")}
					</p>
				</CardContent>
			</Card>
		);
	}

	const includedRemaining =
		BigInt(wallet.includedMonthlyLimitKopecks) - BigInt(wallet.includedUsedPeriodKopecks);
	const reserved = BigInt(wallet.reservedBalanceKopecks);
	const isFrozen = wallet.status !== "active";

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-3">
				<CardTitle>{t("settings.billing.aiCredits.balance.title")}</CardTitle>
				{isFrozen && (
					<span className="rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive text-xs uppercase">
						{wallet.status}
					</span>
				)}
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div className="font-semibold text-3xl">{formatKopecks(wallet.availableBalanceKopecks)}</div>

				<dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-foreground/70 text-sm">
					<dt>{t("settings.billing.aiCredits.balance.includedRemaining")}</dt>
					<dd className="text-right tabular-nums">{formatKopecks(includedRemaining.toString())}</dd>

					<dt>{t("settings.billing.aiCredits.balance.reserved")}</dt>
					<dd className="text-right tabular-nums">{formatKopecks(reserved.toString())}</dd>

					<dt>{t("settings.billing.aiCredits.balance.promo")}</dt>
					<dd className="text-right tabular-nums">{formatKopecks(wallet.promoBalanceKopecks)}</dd>
				</dl>
			</CardContent>
		</Card>
	);
}
