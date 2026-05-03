import { getActiveOrganization } from "@auth/lib/server";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { DataRetentionForm } from "../../../../../../modules/compliance/components/DataRetentionForm";

export async function generateMetadata() {
	const t = await getTranslations("settings.compliance");

	return {
		title: t("title"),
	};
}

export default async function ComplianceSettingsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);

	if (!organization) {
		return notFound();
	}

	const t = await getTranslations("settings.compliance");

	return (
		<>
			<PageHeader title={t("title")} subtitle={t("description")} />
			<DataRetentionForm />
		</>
	);
}
