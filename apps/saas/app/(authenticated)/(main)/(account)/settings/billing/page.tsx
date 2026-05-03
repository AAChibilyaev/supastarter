import { getSession } from "@auth/lib/server";
import { ActivePlan } from "@payments/components/ActivePlan";
import { AiWalletCard } from "@payments/components/AiWalletCard";
import { ChangePlan } from "@payments/components/ChangePlan";
import { OverageTransactionHistory } from "@payments/components/OverageTransactionHistory";
import { PaymentMethodsCard } from "@payments/components/PaymentMethodsCard";
import { TopUpDialog } from "@payments/components/TopUpDialog";
import { listPurchases } from "@payments/lib/server";
import { createPurchasesHelper } from "@repo/payments/lib/helper";
import { PageHeader } from "@shared/components/PageHeader";
import { SettingsList } from "@shared/components/SettingsList";
import { orpc } from "@shared/lib/orpc-query-utils";
import { getServerQueryClient } from "@shared/lib/server";
import { getTranslations } from "next-intl/server";

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
			<PageHeader title={t("title")} subtitle={t("changePlan.description")} />

			<SettingsList>
				{activePlan && <ActivePlan />}
				<ChangePlan userId={session?.user.id} activePlanId={activePlan?.id} />
				<PaymentMethodsCard />
			</SettingsList>

			{/* AI Wallet section for personal account */}
			<div className="mt-8 space-y-4">
				<div className="flex justify-end">
					<TopUpDialog />
				</div>
				<SettingsList>
					<AiWalletCard />
				</SettingsList>
			</div>

			<div className="mt-8">
				<OverageTransactionHistory />
			</div>
		</>
	);
}
