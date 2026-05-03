import { OnboardingAnalyticsCards } from "@admin/components/OnboardingAnalyticsCards";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AdminOnboardingPage() {
	const t = await getTranslations("admin.onboarding");
	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
			<OnboardingAnalyticsCards />
		</>
	);
}
