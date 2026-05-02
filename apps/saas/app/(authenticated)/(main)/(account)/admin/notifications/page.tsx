import { AdminNotificationsView } from "@admin/components/AdminNotificationsView";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AdminNotificationsPage() {
	const t = await getTranslations("admin.notifications");
	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
			<AdminNotificationsView />
		</>
	);
}
