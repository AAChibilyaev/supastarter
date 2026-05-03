import { getActiveOrganization } from "@auth/lib/server";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { OrgAuditLogView } from "../../../../../../../modules/compliance/components/OrgAuditLogView";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const t = await getTranslations("settings.auditLog");

	return {
		title: t("metaTitle") ?? "Audit Log",
	};
}

export default async function AuditLogSettingsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);

	if (!organization) {
		return notFound();
	}

	const t = await getTranslations("settings.auditLog");

	return (
		<>
			<PageHeader title={t("title")} subtitle={t("description")} />
			<OrgAuditLogView organizationId={organization.id} />
		</>
	);
}
