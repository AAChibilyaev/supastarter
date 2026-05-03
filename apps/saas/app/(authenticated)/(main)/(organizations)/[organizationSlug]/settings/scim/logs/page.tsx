import { getActiveOrganization } from "@auth/lib/server";
import { ScimAuditTable } from "@settings/components/scim/ScimAuditTable";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata() {
	const t = await getTranslations("settings");

	return {
		title: t("scim.logs.title"),
	};
}

export default async function ScimLogsPage({
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
			<PageHeader title={t("scim.logs.title")} />
			<ScimAuditTable organizationId={organization.id} />
		</>
	);
}
