import { getActiveOrganization } from "@auth/lib/server";
import { IndexHealthPage } from "@search/components/pages/IndexHealthPage";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata() {
	const t = await getTranslations("search.indexHealth");

	return {
		title: t("title"),
	};
}

export default async function HealthPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);

	if (!organization) {
		return notFound();
	}

	return <IndexHealthPage organizationId={organization.id} orgSlug={organizationSlug} />;
}
