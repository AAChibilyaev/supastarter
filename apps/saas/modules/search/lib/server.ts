import "server-only";
import { getActiveOrganization, getSession } from "@auth/lib/server";
import { isOrganizationAdmin } from "@repo/auth/lib/helper";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function getSearchOrganizationRouteContext(organizationSlug: string) {
	const [organization, session] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);

	if (!organization || !session) {
		return notFound();
	}

	return {
		organization,
		session,
		canManage: isOrganizationAdmin(organization, session.user),
	};
}

export async function getSearchOrganizationMetadataTitle(
	organizationSlug: string,
	titleKey: string,
) {
	const [organization, t] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getTranslations("search"),
	]);

	return `${t(titleKey)} – ${organization?.name ?? ""}`;
}
