import { getSession } from "@auth/lib/server";
import { CheckoutReturnContent } from "@payments/components/CheckoutReturnContent";
import { AuthWrapper } from "@shared/components/AuthWrapper";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	const t = await getTranslations("checkoutReturn");

	return {
		title: t("title"),
	};
}

export default async function CheckoutReturnPage({
	searchParams,
}: {
	searchParams: Promise<{ organizationId?: string }>;
}) {
	const [session, t, { organizationId }] = await Promise.all([
		getSession(),
		getTranslations("checkoutReturn"),
		searchParams,
	]);

	if (!session) {
		redirect("/login");
	}

	return (
		<AuthWrapper>
			<div className="mb-4 text-center">
				<h1 className="font-bold text-2xl lg:text-3xl">{t("title")}</h1>
				<p className="text-sm lg:text-base text-muted-foreground">{t("description")}</p>
			</div>

			<CheckoutReturnContent organizationId={organizationId} />
		</AuthWrapper>
	);
}
