import { getActiveOrganization } from "@auth/lib/server";
import { ScimWizard } from "@settings/components/scim/ScimWizard";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata() {
	const t = await getTranslations("settings");

	return {
		title: t("scim.wizard.title"),
	};
}

export default async function ScimConnectPage({
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
			<PageHeader title={t("scim.wizard.title")} subtitle={t("scim.wizard.selectProvider")} />
			<ScimWizard organizationId={organization.id} />
		</>
	);
}
