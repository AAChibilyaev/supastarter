import type { OrganizationMemberRole } from "@repo/auth";
import { useTranslations } from "next-intl";

export function useOrganizationMemberRoles() {
	const t = useTranslations();

	return {
		owner: t("organizations.roles.owner"),
		admin: t("organizations.roles.admin"),
		member: t("organizations.roles.member"),
		viewer: t("organizations.roles.viewer"),
	} satisfies Record<OrganizationMemberRole, string>;
}
