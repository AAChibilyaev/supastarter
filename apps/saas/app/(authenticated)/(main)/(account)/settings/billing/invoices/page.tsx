import { InvoiceHistory } from "@payments/components/InvoiceHistory";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
	const t = await getTranslations("settings.billing.invoiceHistory");

	return {
		title: t("title"),
	};
}

export default async function InvoicesPage() {
	const t = await getTranslations("settings.billing.invoiceHistory");

	return (
		<>
			<PageHeader title={t("title")} subtitle={t("description")} />
			<div className="mt-4">
				<InvoiceHistory />
			</div>
		</>
	);
}
