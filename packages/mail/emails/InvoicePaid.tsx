import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function InvoicePaid({
	orgName,
	planName,
	amount,
	currency,
	date,
	invoiceUrl,
	manageBillingUrl,
	locale,
	translations,
}: {
	orgName: string;
	planName: string;
	amount: string;
	currency: string;
	date: string;
	invoiceUrl: string;
	manageBillingUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		messages: { ...translations.invoicePaid, common: translations.common },
	});

	return (
		<Wrapper>
			<Text className="font-semibold text-lg">{t("title")}</Text>
			<Text>{t("greeting", { orgName })}</Text>
			<Text>{t("body", { planName, amount: `${currency} ${amount}`, date })}</Text>

			<PrimaryButton href={invoiceUrl}>{t("viewInvoice")} &rarr;</PrimaryButton>

			<Text className="text-sm pt-4 text-muted-foreground">{t("cta")}</Text>
			<PrimaryButton href={manageBillingUrl}>{t("manageBilling")} &rarr;</PrimaryButton>

			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<br />
				<Link href={invoiceUrl}>{invoiceUrl}</Link>
			</Text>
		</Wrapper>
	);
}

InvoicePaid.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	orgName: "Acme Corp",
	planName: "Pro Monthly",
	amount: "$49.00",
	currency: "USD",
	date: "May 1, 2026",
	invoiceUrl: "https://dashboard.stripe.com/invoice/in_123",
	manageBillingUrl: "https://aacsearch.app/org/acme/settings/billing",
};

export default InvoicePaid;
