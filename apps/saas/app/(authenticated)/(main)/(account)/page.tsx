import { getOrganizationList, getSession } from "@auth/lib/server";
import { OrganizationsGrid } from "@organizations/components/OrganizationsGrid";
import { config } from "@repo/auth/config";
import { Card } from "@repo/ui";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function AppStartPage() {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	const organizations = await getOrganizationList();

	if (config.organizations.enable && config.organizations.requireOrganization) {
		const organization =
			organizations.find((org) => org.id === session?.session.activeOrganizationId) ||
			organizations[0];

		if (!organization) {
			redirect("/new-organization");
		}

		redirect(`/${organization.slug}`);
	}

	const t = await getTranslations("start");

	return (
		<div className="">
			<PageHeader
				title={t("welcome", { name: session?.user.name })}
				subtitle={t("subtitle")}
			/>

			<div>
				{config.organizations.enable && <OrganizationsGrid />}

				<Card className="mt-6">
					<div className="h-64 p-8 flex items-center justify-center text-foreground/60">
						Place your content here...
					</div>
				</Card>
			</div>
		</div>
	);
}
