import { SearchAnalyticsCards } from "@search/components/cards/SearchAnalyticsCards";
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
		title: await getSearchOrganizationMetadataTitle(organizationSlug, "analytics.title"),
	};
}

export default async function AnalyticsPage({
	params,
	searchParams,
}: {
	params: Promise<{ organizationSlug: string }>;
	searchParams: Promise<{ tab?: string }>;
}) {
	const { organizationSlug } = await params;
	const { tab } = await searchParams;
	const [{ organization }, t] = await Promise.all([
		getSearchOrganizationRouteContext(organizationSlug),
		getTranslations("search"),
	]);

	return (
		<div className="space-y-6 p-6">
			<PageHeader
				title={t("analytics.title")}
				subtitle={t("analytics.description")}
				className="mb-0"
			/>
			<SearchAnalyticsCards organizationId={organization.id} initialTab={tab} />
		</div>
	);
}
