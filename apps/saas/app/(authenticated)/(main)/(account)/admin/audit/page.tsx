import { AdminAuditView } from "@admin/components/AdminAuditView";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AdminAuditPage() {
	const t = await getTranslations("admin.audit");
	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
			<AdminAuditView />
		</>
	);
}
