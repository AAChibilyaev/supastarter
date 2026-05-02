import { ActiveSessionsBlock } from "@settings/components/ActiveSessionsBlock";
import { PasskeysBlock } from "@settings/components/PasskeysBlock";
import { TwoFactorBlock } from "@settings/components/TwoFactorBlock";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AdminSecurityPage() {
	const t = await getTranslations("admin.security");
	return (
		<>
			<PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />

			<div className="gap-6 grid grid-cols-1">
				<TwoFactorBlock />
				<PasskeysBlock />
				<ActiveSessionsBlock />
			</div>
		</>
	);
}
