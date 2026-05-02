import { RecommendationsPage } from "@search/components/pages/RecommendationsPage";
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
		title: await getSearchOrganizationMetadataTitle(
			organizationSlug,
			"search.nav.recommendations",
		),
	};
}

export default async function RecommendationsRoute({
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
				title={t("nav.recommendations")}
				subtitle={t("recommendations.description")}
				className="mb-0"
			/>
			<RecommendationsPage organizationId={organization.id} />
		</div>
	);
}
