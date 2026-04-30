import { getActiveOrganization, getSession } from "@auth/lib/server";
import { OverviewPage } from "@search/components/pages/OverviewPage";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const t = await getTranslations("search");
	const org = await getActiveOrganization(organizationSlug);
	return { title: `${t("overview.title")} – ${org?.name ?? ""}` };
}

export default async function OverviewPageRoute({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const [org, session] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);
	if (!org || !session) return notFound();

	return (
		<div className="p-6">
			<OverviewPage />
		</div>
	);
}
