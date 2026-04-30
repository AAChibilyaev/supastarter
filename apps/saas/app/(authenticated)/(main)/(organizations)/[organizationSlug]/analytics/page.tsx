import { getActiveOrganization, getSession } from "@auth/lib/server";
import { SearchAnalyticsCards } from "@search/components/SearchAnalyticsCards";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const org = await getActiveOrganization(organizationSlug);
	let title = "Analytics";
	try {
		const t = await getTranslations("search");
		title = t("analytics.title");
	} catch {
		// fallback if locale key missing
	}
	return { title: `${title} – ${org?.name ?? ""}` };
}

export default async function AnalyticsPage({
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
				<h1 className="text-3xl font-bold tracking-tight">Search Analytics</h1>
				<p className="mt-1 text-muted-foreground">
					Track search usage, top queries, zero-results, and trends.
				</p>
			</div>
			<SearchAnalyticsCards organizationId={org.id} />
		</div>
	);
}
