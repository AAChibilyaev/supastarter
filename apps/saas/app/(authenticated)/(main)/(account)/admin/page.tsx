import { AdminOverview } from "@admin/components/AdminOverview";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AdminOverviewPage() {
	const t = await getTranslations("admin.overview");
	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
			<AdminOverview />
		</>
	);
}
