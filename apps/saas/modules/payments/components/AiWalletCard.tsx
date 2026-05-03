"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useLocale, useTranslations } from "next-intl";

import { useAiWallet } from "../hooks/ai-wallet";
import { formatKopecks } from "../lib/format-kopecks";

export function AiWalletCard({ organizationId }: { organizationId?: string }) {
	const t = useTranslations();
	const locale = useLocale();
	const { data: wallet, isLoading } = useAiWallet(organizationId);

	const fmt = (amount: bigint | number | string) => formatKopecks(amount, { appLocale: locale });

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
					<p className="text-sm text-foreground/60">
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
			<CardHeader className="gap-3 flex flex-row items-center justify-between">
				<CardTitle>{t("settings.billing.aiCredits.balance.title")}</CardTitle>
				{isFrozen && (
					<span className="px-2 py-1 font-medium text-xs rounded-md bg-destructive/10 text-destructive uppercase">
						{wallet.status}
					</span>
				)}
			</CardHeader>
			<CardContent className="gap-3 flex flex-col">
				<div className="font-semibold text-3xl">
					{fmt(wallet.availableBalanceKopecks)}
				</div>

				<dl className="gap-x-4 gap-y-1 text-sm grid grid-cols-2 text-foreground/70">
					<dt>{t("settings.billing.aiCredits.balance.includedRemaining")}</dt>
					<dd className="text-right tabular-nums">
						{fmt(includedRemaining.toString())}
					</dd>

					<dt>{t("settings.billing.aiCredits.balance.reserved")}</dt>
					<dd className="text-right tabular-nums">
						{fmt(reserved.toString())}
					</dd>

					<dt>{t("settings.billing.aiCredits.balance.promo")}</dt>
					<dd className="text-right tabular-nums">
						{fmt(wallet.promoBalanceKopecks)}
					</dd>
				</dl>
			</CardContent>
		</Card>
	);
}
