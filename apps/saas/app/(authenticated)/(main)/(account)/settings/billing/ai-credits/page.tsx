import { getSession } from "@auth/lib/server";
import { AiWalletCard } from "@payments/components/AiWalletCard";
import { CreditConsumptionTable } from "@payments/components/CreditConsumptionTable";
import { CreditUsageChart } from "@payments/components/CreditUsageChart";
import { LowBalanceBanner } from "@payments/components/LowBalanceBanner";
import { PricingRateCard } from "@payments/components/PricingRateCard";
import { TopUpDialog } from "@payments/components/TopUpDialog";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { PageHeader } from "@shared/components/PageHeader";
import { SettingsList } from "@shared/components/SettingsList";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("settings.billing.aiCredits");
	return { title: t("title") };
}

export default async function AiCreditsPage() {
	const session = await getSession();
	if (!session) redirect("/login");

	const t = await getTranslations("settings.billing.aiCredits");
	const tBilling = await getTranslations("settings.billing");

	return (
		<>
			<PageHeader title={t("title")} subtitle={t("subtitle")} />

			{/* Low balance warning banner */}
			<div className="mb-6">
				<LowBalanceBanner />
			</div>

			{/* Balance card + top-up button */}
			<div className="mb-6 flex justify-end">
				<TopUpDialog />
			</div>

			<SettingsList>
				<AiWalletCard />
			</SettingsList>

			{/* Usage chart & consumption table */}
			<div className="mt-8">
				<CreditUsageChart />
			</div>

			<div className="mt-6">
				<CreditConsumptionTable />
			</div>

			{/* Rate card */}
			<div className="mt-6">
				<PricingRateCard />
			</div>

			{/* Link to payment methods */}
			<div className="mt-6">
				<Card>
					<CardHeader>
						<CardTitle>{tBilling("paymentMethod.title")}</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="mb-4 text-sm text-muted-foreground">
							{tBilling("paymentMethod.description")}
						</p>
						<Button variant="outline" asChild>
							<Link href="/settings/billing/payment-methods">
								{tBilling("paymentMethod.manage")}
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
