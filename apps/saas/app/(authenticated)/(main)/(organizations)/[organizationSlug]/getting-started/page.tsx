import { getActiveOrganization, getSession } from "@auth/lib/server";
import { GettingStarted } from "@search/components/pages/GettingStarted";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const t = await getTranslations("search.gettingStarted");
	const org = await getActiveOrganization(organizationSlug);
	return { title: `${t("title")} – ${org?.name ?? ""}` };
}

export default async function GettingStartedPage({
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
			<GettingStarted organizationId={org.id} />
		</div>
	);
}
