import { AdminWalletOps } from "@admin/components/AdminWalletOps";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AdminWalletPage() {
	const t = await getTranslations("admin.wallet");
	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
			<AdminWalletOps />
		</>
	);
}
