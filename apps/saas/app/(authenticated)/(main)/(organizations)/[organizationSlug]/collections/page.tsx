import { CollectionsPage } from "@collections/components/pages/CollectionsPage";
import { getBaseUrl } from "@repo/utils";
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
		title: await getSearchOrganizationMetadataTitle(organizationSlug, "collections"),
	};
}

export default async function CollectionsOverviewPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const { organization, canManage } = await getSearchOrganizationRouteContext(organizationSlug);

	return <CollectionsPage />;
}
