import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function DripDay1({
	name,
	videoUrl,
	collectionUrl,
	locale,
	translations,
}: {
	name: string;
	videoUrl: string;
	collectionUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: { ...translations.dripDay1, common: translations.common },
	});

	return (
		<Wrapper>
			<Text>{t("greeting", { name })}</Text>
			<Text>{t("body")}</Text>
			<PrimaryButton href={videoUrl}>{t("watchVideo")} &rarr;</PrimaryButton>
			<Text>{t("orCta")}</Text>
			<PrimaryButton href={collectionUrl}>{t("createCollection")} &rarr;</PrimaryButton>
			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<Link href={videoUrl}>{videoUrl}</Link>
			</Text>
		</Wrapper>
	);
}

DripDay1.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	name: "John Doe",
	videoUrl: "#",
	collectionUrl: "#",
};

export default DripDay1;
