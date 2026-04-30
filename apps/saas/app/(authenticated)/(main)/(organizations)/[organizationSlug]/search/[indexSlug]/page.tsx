import { getActiveOrganization, getSession } from "@auth/lib/server";
import { CollectionDetail } from "@search/components/CollectionDetail";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string; indexSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const t = await getTranslations("search");
	const org = await getActiveOrganization(organizationSlug);
	return { title: `${t("collection.title")} – ${org?.name ?? ""}` };
}

export default async function CollectionDetailPage({
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

	return <CollectionDetail />;
}
