import { getActiveOrganization } from "@auth/lib/server";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { DataResidencyForm } from "../../../../../../modules/compliance/components/DataResidencyForm";
import { DataRetentionForm } from "../../../../../../../modules/compliance/components/DataRetentionForm";

export async function generateMetadata() {
	const t = await getTranslations("settings.compliance");

	return {
		title: t("title"),
	};
}

export default async function ComplianceSettingsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);

	if (!organization) {
		return notFound();
	}

	const t = await getTranslations("settings.compliance");

	return (
		<>
			<PageHeader title={t("title")} subtitle={t("description")} />

			<div className="gap-8 flex flex-col">
				<section>
					<h2 className="mb-4 font-medium text-lg">
						{t("dataResidency.title")}
					</h2>
					<DataResidencyForm />
				</section>

				<hr className="border-border" />

				<section>
					<h2 className="mb-4 font-medium text-lg">
						{t("dataRetention.title")}
					</h2>
					<DataRetentionForm />
				</section>
			</div>
		</>
	);
}
