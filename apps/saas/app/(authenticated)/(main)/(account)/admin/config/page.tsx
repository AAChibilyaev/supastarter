import { AdminConfigView } from "@admin/components/AdminConfigView";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AdminConfigPage() {
	const t = await getTranslations("admin.config");
	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
			<AdminConfigView />
		</>
	);
}
