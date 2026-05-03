"use client";

import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { useAiWallet } from "../hooks/ai-wallet";
import { formatKopecks } from "../lib/format-kopecks";

interface LowBalanceBannerProps {
	organizationId?: string;
	/** Balance threshold in kopecks below which the banner shows */
	thresholdKopecks?: bigint;
}

export function LowBalanceBanner({
	organizationId,
	thresholdKopecks = BigInt(50000), // default: 500 RUB
}: LowBalanceBannerProps) {
	const t = useTranslations("settings.billing.aiCredits.lowBalance");
	const locale = useLocale();
	const { data: wallet, isLoading } = useAiWallet(organizationId);

	if (isLoading || !wallet) return null;

	const available = BigInt(wallet.availableBalanceKopecks);
	const isLow = available <= thresholdKopecks;

	if (!isLow) return null;

	return (
		<Alert variant="error">
			<AlertTitle className="font-semibold">{t("title")}</AlertTitle>
			<AlertDescription className="mt-1">
				{t("message", { balance: formatKopecks(available, { appLocale: locale }) })}
			</AlertDescription>
			<div className="mt-2">
				<Button variant="outline" size="sm" asChild>
					<Link href="/settings/billing/ai-credits">{t("topUp")}</Link>
				</Button>
			</div>
		</Alert>
	);
}
