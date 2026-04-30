import { getActiveOrganization, getSession } from "@auth/lib/server";
import { RelevanceTabs } from "@search/components/RelevanceTabs";
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
	return { title: `${t("relevance.title")} – ${org?.name ?? ""}` };
}

export default async function RelevancePage({
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
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Search Relevance</h1>
				<p className="mt-1 text-muted-foreground">
					Manage synonyms, curations, and search result rankings.
				</p>
			</div>
			<RelevanceTabs organizationId={org.id} />
		</div>
	);
}
