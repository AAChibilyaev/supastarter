import { getSession } from "@auth/lib/server";
import { AiWalletCard } from "@payments/components/AiWalletCard";
import { TopUpDialog } from "@payments/components/TopUpDialog";
import { PageHeader } from "@shared/components/PageHeader";
import { SettingsList } from "@shared/components/SettingsList";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

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

			<div className="mb-6 flex justify-end">
				<TopUpDialog />
			</div>

			<SettingsList>
				<AiWalletCard />
			</SettingsList>
		</>
	);
}
