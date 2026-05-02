import { AdminIntegrationsView } from "@admin/components/AdminIntegrationsView";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AdminIntegrationsPage() {
	const t = await getTranslations("admin.integrations");
	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
			<AdminIntegrationsView />
		</>
	);
}
