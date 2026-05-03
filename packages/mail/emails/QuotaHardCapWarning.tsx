import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function QuotaHardCapWarning({
	orgName,
	planName,
	overageEnabled,
	billingUrl,
	locale,
	translations,
}: {
	orgName: string;
	planName: string;
	overageEnabled: boolean;
	billingUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: { ...translations.quotaHardCap, common: translations.common },
	});

	return (
		<Wrapper>
			<Text className="font-semibold text-lg">{t("title")}</Text>
			<Text>
				{overageEnabled
					? t("bodyOverage", { orgName, planName })
					: t("bodyBlocked", { orgName, planName })}
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

QuotaHardCapWarning.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	orgName: "Acme Corp",
	planName: "Pro",
	overageEnabled: false,
	billingUrl: "https://aacsearch.app/org/acme/settings/billing",
};

export default QuotaHardCapWarning;
