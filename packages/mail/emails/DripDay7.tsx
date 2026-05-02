import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function DripDay7({
	name,
	settingsUrl,
	locale,
	translations,
}: {
	name: string;
	settingsUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: { ...translations.dripDay7, common: translations.common },
	});

	return (
		<Wrapper>
			<Text>{t("greeting", { name })}</Text>
			<Text>{t("body")}</Text>
			<Text>{t("tip1")}</Text>
			<Text>{t("tip2")}</Text>
			<Text>{t("tip3")}</Text>
			<PrimaryButton href={settingsUrl}>{t("goToSettings")} &rarr;</PrimaryButton>
			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<Link href={settingsUrl}>{settingsUrl}</Link>
			</Text>
		</Wrapper>
	);
}

DripDay7.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	name: "John Doe",
	settingsUrl: "#",
};

export default DripDay7;
