import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function DripDay3({
	name,
	connectorUrl,
	docsUrl,
	locale,
	translations,
}: {
	name: string;
	connectorUrl: string;
	docsUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: { ...translations.dripDay3, common: translations.common },
	});

	return (
		<Wrapper>
			<Text>{t("greeting", { name })}</Text>
			<Text>{t("body")}</Text>
			<Text>{t("supported")}</Text>
			<Text>{t("benefit1")}</Text>
			<Text>{t("benefit2")}</Text>
			<PrimaryButton href={connectorUrl}>{t("connectNow")} &rarr;</PrimaryButton>
			<Text>{t("orDocs")}</Text>
			<Link href={docsUrl}>{t("viewDocs")}</Link>
			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<Link href={connectorUrl}>{connectorUrl}</Link>
			</Text>
		</Wrapper>
	);
}

DripDay3.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	name: "John Doe",
	connectorUrl: "#",
	docsUrl: "#",
};

export default DripDay3;
