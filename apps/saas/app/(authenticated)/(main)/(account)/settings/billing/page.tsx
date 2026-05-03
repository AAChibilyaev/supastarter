import { getSession } from "@auth/lib/server";
import { InvoiceHistory } from "@payments/components/InvoiceHistory";
import { PaymentMethodCard } from "@payments/components/PaymentMethodCard";
import { ActivePlan } from "@payments/components/ActivePlan";
import { ChangePlan } from "@payments/components/ChangePlan";
import { UpgradeSuccessToast } from "@payments/components/UpgradeSuccessToast";
import { listPurchases } from "@payments/lib/server";
import { createPurchasesHelper } from "@repo/payments/lib/helper";
import { PageHeader } from "@shared/components/PageHeader";
import { SettingsItem } from "@shared/components/SettingsItem";
import { SettingsList } from "@shared/components/SettingsList";
import { orpc } from "@shared/lib/orpc-query-utils";
import { getServerQueryClient } from "@shared/lib/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata() {
	const t = await getTranslations("settings.billing");

	return {
		title: t("title"),
	};
}

export default async function BillingSettingsPage() {
	const session = await getSession();
	const purchases = await listPurchases();

	const queryClient = getServerQueryClient();

	await queryClient.prefetchQuery({
		queryKey: orpc.payments.listPurchases.queryKey({
			input: {},
		}),
		queryFn: () => purchases,
	});

	const { activePlan } = createPurchasesHelper(purchases);

	const t = await getTranslations("settings.billing");

	return (
		<>
			<Suspense fallback={null}>
				<UpgradeSuccessToast />
			</Suspense>
			<PageHeader title={t("title")} subtitle={t("changePlan.description")} />

			<SettingsList>
				{activePlan && <ActivePlan />}
				<ChangePlan userId={session?.user.id} activePlanId={activePlan?.id} />
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
		</>
	);
}
