import { FeatureFlagsView } from "@admin/components/FeatureFlagsView";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AdminFeatureFlagsPage() {
	const t = await getTranslations("admin.featureFlags");

	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
			<FeatureFlagsView />
		</>
	);
}
