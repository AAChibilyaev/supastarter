import { AdminRoadmapPanel } from "@admin/components/AdminRoadmapPanel";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AdminRoadmapPage() {
	const t = await getTranslations("admin.roadmap");
	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
			<AdminRoadmapPanel />
		</>
	);
}
