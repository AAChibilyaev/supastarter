import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function DripDay14({
	name,
	caseStudyUrl,
	blogUrl,
	locale,
	translations,
}: {
	name: string;
	caseStudyUrl: string;
	blogUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: { ...translations.dripDay14, common: translations.common },
	});

	return (
		<Wrapper>
			<Text>{t("greeting", { name })}</Text>
			<Text>{t("body")}</Text>
			<Text>{t("teaser")}</Text>
			<PrimaryButton href={caseStudyUrl}>{t("readCaseStudy")} &rarr;</PrimaryButton>
			<Text>{t("orMore")}</Text>
			<Link href={blogUrl}>{t("visitBlog")}</Link>
			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<Link href={caseStudyUrl}>{caseStudyUrl}</Link>
			</Text>
		</Wrapper>
	);
}

DripDay14.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	name: "John Doe",
	caseStudyUrl: "#",
	blogUrl: "#",
};

export default DripDay14;
