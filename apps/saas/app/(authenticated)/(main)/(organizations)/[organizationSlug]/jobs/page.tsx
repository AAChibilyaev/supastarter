import {
	getSearchOrganizationMetadataTitle,
	getSearchOrganizationRouteContext,
} from "@search/lib/server";
import { JobsDashboardPage } from "@search/components/pages/JobsDashboardPage";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	return {
		title: await getSearchOrganizationMetadataTitle(organizationSlug, "jobs.title"),
	};
}

export default async function JobsPage({
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
				title={t("jobs.title")}
				subtitle={t("jobs.subtitle")}
				className="mb-0"
			/>
			<JobsDashboardPage organizationId={organization.id} />
		</div>
	);
}
