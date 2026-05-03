import { PaymentMethodCard } from "@payments/components/PaymentMethodCard";
import { listPurchases } from "@payments/lib/server";
import { createPurchasesHelper } from "@repo/payments/lib/helper";
import { PageHeader } from "@shared/components/PageHeader";
import { SettingsList } from "@shared/components/SettingsList";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
	const t = await getTranslations("settings.billing.paymentMethod");

	return {
		title: t("title"),
	};
}

export default async function PaymentMethodsPage() {
	const purchases = await listPurchases();
	const { activePlan } = createPurchasesHelper(purchases);

	const t = await getTranslations("settings.billing.paymentMethod");

	return (
		<>
			<PageHeader title={t("title")} subtitle={t("description")} />

			{activePlan?.purchaseId ? (
				<div className="mt-4">
					<SettingsList>
						<PaymentMethodCard purchaseId={activePlan.purchaseId} />
					</SettingsList>
				</div>
			) : (
				<p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
			)}
		</>
	);
}
