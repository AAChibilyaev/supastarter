import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function SubscriptionCancelled({
	orgName,
	planName,
	endDate,
	reactivateUrl,
	manageBillingUrl,
	locale,
	translations,
}: {
	orgName: string;
	planName: string;
	endDate: string;
	reactivateUrl: string;
	manageBillingUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		messages: { ...translations.subscriptionCancelled, common: translations.common },
	});

	return (
		<Wrapper>
			<Text className="font-semibold text-lg">{t("title")}</Text>
			<Text>{t("greeting", { orgName })}</Text>
			<Text>{t("body", { planName, endDate })}</Text>

			<Text className="text-sm text-muted-foreground">{t("info")}</Text>
			<PrimaryButton href={reactivateUrl}>{t("reactivate")} &rarr;</PrimaryButton>

			<Text className="text-sm pt-4 text-muted-foreground">{t("feedback")}</Text>
			<Text className="text-sm text-muted-foreground">{t("signoff")}</Text>

			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<br />
				<Link href={manageBillingUrl}>{manageBillingUrl}</Link>
			</Text>
		</Wrapper>
	);
}

SubscriptionCancelled.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	orgName: "Acme Corp",
	planName: "Pro Monthly",
	endDate: "June 1, 2026",
	reactivateUrl: "https://aacsearch.app/org/acme/settings/billing",
	manageBillingUrl: "https://aacsearch.app/org/acme/settings/billing",
};

export default SubscriptionCancelled;
