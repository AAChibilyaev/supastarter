import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function DripDay30({
	name,
	feedbackUrl,
	locale,
	translations,
}: {
	name: string;
	feedbackUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: { ...translations.dripDay30, common: translations.common },
	});

	return (
		<Wrapper>
			<Text>{t("greeting", { name })}</Text>
			<Text>{t("body")}</Text>
			<Text>{t("question1")}</Text>
			<Text>{t("question2")}</Text>
			<PrimaryButton href={feedbackUrl}>{t("shareFeedback")} &rarr;</PrimaryButton>
			<Text>{t("replyNote")}</Text>
			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<Link href={feedbackUrl}>{feedbackUrl}</Link>
			</Text>
		</Wrapper>
	);
}

DripDay30.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	name: "John Doe",
	feedbackUrl: "#",
};

export default DripDay30;
