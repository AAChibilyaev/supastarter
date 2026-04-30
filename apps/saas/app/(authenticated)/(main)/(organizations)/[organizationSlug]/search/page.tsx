import { getActiveOrganization, getSession } from "@auth/lib/server";
import { isOrganizationAdmin } from "@repo/auth/lib/helper";
import { getBaseUrl } from "@repo/utils";
import { SearchDashboard } from "@search/components/SearchDashboard";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const t = await getTranslations("search");
	const activeOrganization = await getActiveOrganization(organizationSlug);
	return {
		title: `${t("title")} – ${activeOrganization?.name ?? ""}`,
	};
}

export default async function SearchPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;

	const [activeOrganization, session] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);

	if (!activeOrganization || !session) {
		return notFound();
	}

	const canManage = isOrganizationAdmin(activeOrganization, session.user);

	return (
		<SearchDashboard
			organizationId={activeOrganization.id}
			canManage={canManage}
			baseUrl={getBaseUrl(process.env.NEXT_PUBLIC_SAAS_URL, 3000)}
		/>
	);
}
