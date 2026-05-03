import { getActiveOrganization } from "@auth/lib/server";
import { InvoiceHistory } from "@payments/components/InvoiceHistory";
import { PaymentMethodCard } from "@payments/components/PaymentMethodCard";
import { ActivePlan } from "@payments/components/ActivePlan";
import { AiWalletCard } from "@payments/components/AiWalletCard";
import { ChangePlan } from "@payments/components/ChangePlan";
import { TopUpDialog } from "@payments/components/TopUpDialog";
import { UpgradeSuccessToast } from "@payments/components/UpgradeSuccessToast";
import { listPurchases } from "@payments/lib/server";
import { createPurchasesHelper } from "@repo/payments/lib/helper";
import { BillingPlanInfo } from "@search/components/sections/BillingPlanInfo";
import { OverageStatusCard } from "@search/components/sections/OverageStatusCard";
import { PageHeader } from "@shared/components/PageHeader";
import { SettingsItem } from "@shared/components/SettingsItem";
import { SettingsList } from "@shared/components/SettingsList";
import { orpc } from "@shared/lib/orpc-query-utils";
import { getServerQueryClient } from "@shared/lib/server";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata() {
	const t = await getTranslations("settings.billing");

	return {
		title: t("title"),
	};
}

export default async function BillingSettingsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);

	if (!organization) {
		return notFound();
	}

	const purchases = await listPurchases(organization.id);

	const queryClient = getServerQueryClient();

	await queryClient.prefetchQuery({
		queryKey: orpc.payments.listPurchases.queryKey({
			input: {
				organizationId: organization.id,
			},
		}),
		queryFn: () => purchases,
	});

	const { activePlan } = createPurchasesHelper(purchases);

	const t = await getTranslations("settings.billing");

	// Check if the user is on Russian locale for Tochka wallet
	const locale = await getLocale();

	return (
		<>
			<Suspense fallback={null}>
				<UpgradeSuccessToast />
			</Suspense>
			<PageHeader title={t("title")} subtitle={t("changePlan.description")} />

			{/* AACsearch-specific plan info */}
			<div className="mb-6 space-y-6">
				<BillingPlanInfo />
				<OverageStatusCard />
			</div>

			<SettingsList>
				{activePlan && <ActivePlan organizationId={organization.id} />}
				<ChangePlan organizationId={organization.id} activePlanId={activePlan?.id} />
			</SettingsList>

			{activePlan?.purchaseId && (
				<div className="mt-8 space-y-6">
					<SettingsItem title={t("settings.billing.paymentMethod.title")}>
						<PaymentMethodCard purchaseId={activePlan.purchaseId} />
					</SettingsItem>

					<SettingsItem title={t("settings.billing.invoiceHistory.title")}>
						<InvoiceHistory purchaseId={activePlan.purchaseId} />
					</SettingsItem>
				</div>
			)}

			{/* Tochka wallet topup for Russian locale */}
			{locale === "ru" && (
				<div className="mt-8 space-y-4">
					<div className="flex justify-end">
						<TopUpDialog organizationId={organization.id} />
					</div>
					<SettingsList>
						<AiWalletCard organizationId={organization.id} />
					</SettingsList>
				</div>
			)}
		</>
	);
}
