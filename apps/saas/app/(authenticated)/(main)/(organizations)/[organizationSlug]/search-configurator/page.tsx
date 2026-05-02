import { SearchConfigPage } from "@search/components/pages/SearchConfigPage";
import {
	getSearchOrganizationMetadataTitle,
	getSearchOrganizationRouteContext,
} from "@search/lib/server";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	return {
		title: await getSearchOrganizationMetadataTitle(organizationSlug, "configurator.pageTitle"),
	};
}

export default async function SearchConfiguratorRoute({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const [{ organization }, t] = await Promise.all([
		getSearchOrganizationRouteContext(organizationSlug),
		getTranslations("search"),
	]);

	return (
		<div className="space-y-6 p-6">
			<PageHeader
				title={t("configurator.pageTitle")}
				subtitle={t("configurator.pageDescription")}
				className="mb-0"
			/>
			<SearchConfigPage organizationId={organization.id} />
		</div>
	);
}
