import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function TrialExpired({
	orgName,
	billingUrl,
	locale,
	translations,
}: {
	orgName: string;
	billingUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		messages: { ...translations.trialExpired, common: translations.common },
	});

	return (
		<Wrapper>
			<Text className="font-semibold text-lg">{t("title")}</Text>
			<Text>{t("greeting", { orgName })}</Text>
			<Text>{t("body")}</Text>
			<Text>{t("preservation")}</Text>

			<Text>{t("actionPrompt")}</Text>
			<PrimaryButton href={billingUrl}>{t("restoreFeatures")} &rarr;</PrimaryButton>

			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<br />
				<Link href={billingUrl}>{billingUrl}</Link>
			</Text>
		</Wrapper>
	);
}

TrialExpired.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	orgName: "Acme Corp",
	billingUrl: "https://aacsearch.app/org/acme/settings/billing",
};

export default TrialExpired;
