import { BillingAnalyticsSection } from "@admin/components/BillingAnalyticsSection";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
	const t = await getTranslations("admin.billingAnalytics");

	return {
		title: t("pageTitle"),
	};
}

export default async function AdminBillingAnalyticsPage() {
	const t = await getTranslations("admin.billingAnalytics");

	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
			<BillingAnalyticsSection />
		</>
	);
}
