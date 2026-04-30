import { getActiveOrganization } from "@auth/lib/server";
import { notFound, redirect } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;

	const activeOrganization = await getActiveOrganization(organizationSlug as string);

	return {
		title: activeOrganization?.name,
	};
}

export default async function OrganizationPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;

	const activeOrganization = await getActiveOrganization(organizationSlug as string);

	if (!activeOrganization) {
		return notFound();
	}

	redirect(`/${organizationSlug}/search`);
}
