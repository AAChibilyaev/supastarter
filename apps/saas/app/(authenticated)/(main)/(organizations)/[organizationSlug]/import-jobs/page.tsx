import { getActiveOrganization, getSession } from "@auth/lib/server";
import { ImportJobsPanel } from "@search/components/ImportJobsPanel";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const org = await getActiveOrganization(organizationSlug);
	let title = "Import Jobs";
	try {
		const t = await getTranslations("search");
		title = t("importJobsPage.title");
	} catch {
		// fallback if locale key missing
	}
	return { title: `${title} – ${org?.name ?? ""}` };
}

export default async function ImportJobsPage({
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
				<h1 className="text-3xl font-bold tracking-tight">Import Jobs</h1>
				<p className="mt-1 text-muted-foreground">
					Recent document import and sync activity from the ingest buffer.
				</p>
			</div>
			<ImportJobsPanel organizationId={org.id} />
		</div>
	);
}
