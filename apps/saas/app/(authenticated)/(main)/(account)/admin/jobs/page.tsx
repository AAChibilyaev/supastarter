import { AdminJobsView } from "@admin/components/AdminJobsView";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AdminJobsPage() {
	const t = await getTranslations("admin.jobs");
	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
			<AdminJobsView />
		</>
	);
}
