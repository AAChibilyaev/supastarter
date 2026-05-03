import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function SubscriptionUpgrade({
	orgName,
	planName,
	nextBillingDate,
	manageSubscriptionUrl,
	dashboardUrl,
	locale,
	translations,
}: {
	orgName: string;
	planName: string;
	nextBillingDate: string;
	manageSubscriptionUrl: string;
	dashboardUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		messages: { ...translations.subscriptionUpgrade, common: translations.common },
	});

	return (
		<Wrapper>
			<Text className="font-semibold text-lg">{t("greeting", { orgName })}</Text>
			<Text>{t("body", { planName })}</Text>

			<Text className="font-semibold">{t("nextBillingDate")}</Text>
			<Text>{nextBillingDate}</Text>

			<PrimaryButton href={manageSubscriptionUrl}>
				{t("manageSubscription")} &rarr;
			</PrimaryButton>

			<Text className="text-sm pt-4 text-muted-foreground">{t("cta")}</Text>

			<PrimaryButton href={dashboardUrl}>{t("openDashboard")} &rarr;</PrimaryButton>

			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<br />
				<Link href={manageSubscriptionUrl}>{manageSubscriptionUrl}</Link>
			</Text>

			<Text className="text-sm text-muted-foreground">{t("signoff")}</Text>
		</Wrapper>
	);
}

SubscriptionUpgrade.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	orgName: "Acme Corp",
	planName: "Pro",
	nextBillingDate: "June 1, 2026",
	manageSubscriptionUrl: "https://aacsearch.app/org/acme/settings/billing",
	dashboardUrl: "https://aacsearch.app/org/acme/overview",
};

export default SubscriptionUpgrade;
