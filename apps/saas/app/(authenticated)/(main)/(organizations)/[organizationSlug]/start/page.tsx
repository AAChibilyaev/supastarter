import { getActiveOrganization, getSession } from "@auth/lib/server";
import { OnboardingForm } from "@onboarding/components/OnboardingForm";
import { config } from "@repo/auth/config";
import { AuthWrapper } from "@shared/components/AuthWrapper";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const t = await getTranslations("onboarding");
	const org = await getActiveOrganization(organizationSlug);
	return {
		title: `${t("title")} – ${org?.name ?? organizationSlug}`,
	};
}

export default async function StartPage({
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

	// Redirect to overview if onboarding is already complete
	if (!config.users.enableOnboarding || session.user.onboardingComplete) {
		redirect(`/${organizationSlug}/overview`);
	}

	return (
		<div className="p-6 max-w-3xl mx-auto">
			<AuthWrapper>
				<OnboardingForm />
			</AuthWrapper>
		</div>
	);
}
