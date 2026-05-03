import { getActiveOrganization } from "@auth/lib/server";
import { WebhooksPanel } from "@search/components/panels/WebhooksPanel";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata() {
	const t = await getTranslations("search.webhooks");

	return {
		title: t("title"),
	};
}

export default async function WebhooksSettingsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);

	if (!organization) {
		return notFound();
	}

	const t = await getTranslations("search.webhooks");

	return (
		<>
			<PageHeader title={t("title")} subtitle={t("description")} />
			<WebhooksPanel organizationId={organization.id} />
		</>
	);
}
