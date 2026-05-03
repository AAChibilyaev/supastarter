import { getActiveOrganization } from "@auth/lib/server";
import { ScimOverviewPanel } from "@settings/components/scim/ScimOverviewPanel";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata() {
	const t = await getTranslations("settings");

	return {
		title: t("scim.title"),
	};
}

export default async function ScimSettingsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);

	if (!organization) {
		return notFound();
	}

	const t = await getTranslations("settings");

	return (
		<>
			<PageHeader title={t("scim.title")} subtitle={t("scim.description")} />
			<ScimOverviewPanel organizationId={organization.id} />
		</>
	);
}
