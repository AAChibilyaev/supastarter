import { getBaseUrl } from "@repo/utils";
import { SearchDashboard } from "@search/components/SearchDashboard";
import {
	getSearchOrganizationMetadataTitle,
	getSearchOrganizationRouteContext,
} from "@search/lib/server";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	return {
		title: await getSearchOrganizationMetadataTitle(organizationSlug, "title"),
	};
}

export default async function SearchPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const { organization, canManage } = await getSearchOrganizationRouteContext(organizationSlug);

	return (
		<SearchDashboard
			organizationId={organization.id}
			canManage={canManage}
			baseUrl={getBaseUrl(process.env.NEXT_PUBLIC_SAAS_URL, 3000)}
		/>
	);
}
