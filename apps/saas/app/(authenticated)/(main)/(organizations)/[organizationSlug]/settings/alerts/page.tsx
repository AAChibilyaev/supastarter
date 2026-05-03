import { getActiveOrganization } from "@auth/lib/server";
import { AlertsSettingsPage } from "@search/components/pages/AlertsSettingsPage";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata() {
	const t = await getTranslations("settings.alertsPage");

	return {
		title: t("title"),
	};
}

export default async function AlertsSettingsRoute({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);

	if (!organization) {
		return notFound();
	}

	const t = await getTranslations("settings.alertsPage");

	return (
		<>
			<PageHeader title={t("title")} subtitle={t("subtitle")} />
			<AlertsSettingsPage organizationId={organization.id} />
		</>
	);
}
