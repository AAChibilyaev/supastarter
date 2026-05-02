import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function DripDay21({
	name,
	billingUrl,
	locale,
	translations,
}: {
	name: string;
	billingUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: { ...translations.dripDay21, common: translations.common },
	});

	return (
		<Wrapper>
			<Text>{t("greeting", { name })}</Text>
			<Text>{t("body")}</Text>
			<Text>{t("benefit1")}</Text>
			<Text>{t("benefit2")}</Text>
			<Text>{t("benefit3")}</Text>
			<PrimaryButton href={billingUrl}>{t("upgrade")} &rarr;</PrimaryButton>
			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<Link href={billingUrl}>{billingUrl}</Link>
			</Text>
		</Wrapper>
	);
}

DripDay21.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	name: "John Doe",
	billingUrl: "#",
};

export default DripDay21;
