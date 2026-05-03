import { Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";

import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
import { defaultLocale, defaultTranslations } from "../lib/translations";
import type { BaseMailProps } from "../types";

export function PaymentFailed({
	orgName,
	planName,
	brand,
	last4,
	amount,
	currency,
	date,
	updatePaymentUrl,
	manageBillingUrl,
	locale,
	translations,
}: {
	orgName: string;
	planName: string;
	brand: string;
	last4: string;
	amount: string;
	currency: string;
	date: string;
	updatePaymentUrl: string;
	manageBillingUrl: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		messages: { ...translations.paymentFailed, common: translations.common },
	});

	return (
		<Wrapper>
			<Text className="font-semibold text-lg">{t("title")}</Text>
			<Text>{t("greeting", { orgName })}</Text>
			<Text>{t("body", { planName, amount: `${currency} ${amount}`, date })}</Text>

			<Text className="text-sm text-muted-foreground">{t("cardInfo", { brand, last4 })}</Text>

			<Text>{t("action")}</Text>
			<PrimaryButton href={updatePaymentUrl}>{t("updatePayment")} &rarr;</PrimaryButton>

			<Text className="text-sm pt-4 text-muted-foreground">{t("warning")}</Text>
			<PrimaryButton href={manageBillingUrl}>{t("manageBilling")} &rarr;</PrimaryButton>

			<Text className="text-sm text-muted-foreground">
				{t("common.openLinkInBrowser")}
				<br />
				<Link href={updatePaymentUrl}>{updatePaymentUrl}</Link>
			</Text>
		</Wrapper>
	);
}

PaymentFailed.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	orgName: "Acme Corp",
	planName: "Pro Monthly",
	brand: "Visa",
	last4: "4242",
	amount: "$49.00",
	currency: "USD",
	date: "May 1, 2026",
	updatePaymentUrl: "https://aacsearch.app/org/acme/settings/billing/payment-methods",
	manageBillingUrl: "https://aacsearch.app/org/acme/settings/billing",
};

export default PaymentFailed;
