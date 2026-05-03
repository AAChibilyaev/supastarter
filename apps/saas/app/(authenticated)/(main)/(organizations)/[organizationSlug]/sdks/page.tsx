import { getActiveOrganization, getSession } from "@auth/lib/server";
import { SdksPage } from "@search/components/pages/SdksPage";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const t = await getTranslations("sdks");
	const org = await getActiveOrganization(organizationSlug);
	return { title: `${t("title")} \u2013 ${org?.name ?? ""}` };
}

export default async function SdksRoute({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const [org, session] = await Promise.all([getActiveOrganization(organizationSlug), getSession()]);
	if (!org || !session) return notFound();

	return <SdksPage />;
}
