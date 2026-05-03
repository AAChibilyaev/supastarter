import { getSession } from "@auth/lib/server";
import { CreditConsumptionTable } from "@payments/components/CreditConsumptionTable";
import { CreditUsageChart } from "@payments/components/CreditUsageChart";
import { LowBalanceBanner } from "@payments/components/LowBalanceBanner";
import { PricingRateCard } from "@payments/components/PricingRateCard";
import { TopUpDialog } from "@payments/components/TopUpDialog";
import { PageHeader } from "@shared/components/PageHeader";
import { SettingsList } from "@shared/components/SettingsList";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("settings.billing.aiCredits");
	return { title: t("title") };
}

export default async function AiCreditsPage() {
	const session = await getSession();
	if (!session) redirect("/login");

	const t = await getTranslations("settings.billing.aiCredits");

	return (
		<>
			<PageHeader title={t("title")} subtitle={t("subtitle")} />

			<LowBalanceBanner />

			<div className="mt-6 mb-6 flex justify-end">
				<TopUpDialog />
			</div>

			<SettingsList>
				<CreditUsageChart />
			</SettingsList>

			<div className="mt-8">
				<CreditConsumptionTable />
			</div>

			<div className="mt-8">
				<PricingRateCard />
			</div>
		</>
	);
}
