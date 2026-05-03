import { getActiveOrganization, getSession } from "@auth/lib/server";
import { IndexManagementPage } from "@indexing/components/pages/IndexManagementPage";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string; indexSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const t = await getTranslations("indexing.dashboard");
	const org = await getActiveOrganization(organizationSlug);
	return { title: `${t("title")} \u2013 ${org?.name ?? ""}` };
}

export default async function IndexManagementRoute({
	params,
}: {
	params: Promise<{ organizationSlug: string; indexSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const [org, session] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);
	if (!org || !session) return notFound();

	return <IndexManagementPage />;
}
