import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function QuotaSoftCapWarning({
	orgName,
	planName,
	percentUsed,
	remaining,
	billingUrl,
	locale,
	translations,
}: {
	orgName: string;
	planName: string;
	percentUsed: number;
	remaining: number;
	billingUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: { ...translations.quotaSoftCap, common: translations.common },
	});

	return (
		<Wrapper>
			<Text className="font-semibold text-lg">{t("title")}</Text>
			<Text>
				{t("body", {
					orgName,
					planName,
					percentUsed: Math.round(percentUsed),
					remaining: remaining.toLocaleString(),
				})}
			</Text>
			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<br />
				<Link href={billingUrl}>{billingUrl}</Link>
			</Text>
			<PrimaryButton href={billingUrl}>{t("cta")} &rarr;</PrimaryButton>
		</Wrapper>
	);
}

QuotaSoftCapWarning.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	orgName: "Acme Corp",
	planName: "Pro",
	percentUsed: 80,
	remaining: 200,
	billingUrl: "https://aacsearch.app/org/acme/settings/billing",
};

export default QuotaSoftCapWarning;
