import { WidgetPage } from "@search/components/pages/WidgetPage";
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
		title: await getSearchOrganizationMetadataTitle(organizationSlug, "search.nav.widget"),
	};
}

export default async function WidgetRoute({
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
				title={t("nav.widget")}
				subtitle={t("widget.description")}
				className="mb-0"
			/>
			<WidgetPage organizationId={organization.id} />
		</div>
	);
}
