import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function DripDay0({
	name,
	quickstartUrl,
	locale,
	translations,
}: {
	name: string;
	quickstartUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: { ...translations.dripDay0, common: translations.common },
	});

	return (
		<Wrapper>
			<Text>{t("greeting", { name })}</Text>
			<Text>{t("body")}</Text>
			<Text>{t("whatsNext")}</Text>
			<Text>
				{t("step1")}
				<br />
				{t("step2")}
				<br />
				{t("step3")}
				<br />
				{t("step4")}
			</Text>
			<PrimaryButton href={quickstartUrl}>{t("cta")} &rarr;</PrimaryButton>
			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<Link href={quickstartUrl}>{quickstartUrl}</Link>
			</Text>
		</Wrapper>
	);
}

DripDay0.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	name: "John Doe",
	quickstartUrl: "#",
};

export default DripDay0;
