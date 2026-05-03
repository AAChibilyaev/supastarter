import { getSession } from "@auth/lib/server";
import { config } from "@repo/auth/config";
import { Logo } from "@repo/ui";
import { SettingsMenu } from "@settings/components/SettingsMenu";
import { PageHeader } from "@shared/components/PageHeader";
import {
	ActivityIcon,
	BanknoteIcon,
	BellIcon,
	Building2Icon,
	ClipboardListIcon,
	CogIcon,
	PlaySquareIcon,
	ShieldIcon,
	UsersIcon,
	WalletIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function AdminLayout({ children }: PropsWithChildren) {
	const t = await getTranslations("admin");
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	if (session.user?.role !== "admin") {
		redirect("/");
	}

	return (
		<>
			<PageHeader title={t("title")} subtitle={t("description")} />

			<SettingsMenu
				className="mb-6"
				menuItems={[
					{
						avatar: <Logo className="size-8" withLabel={false} />,
						title: t("title"),
						items: [
							{
								title: "Overview",
								href: "/admin",
								icon: <ActivityIcon className="size-4 opacity-50" />,
							},
							{
								title: t("menu.users"),
								href: "/admin/users",
								icon: <UsersIcon className="size-4 opacity-50" />,
							},
							{
								title: "Wallet Ops",
								href: "/admin/wallet",
								icon: <WalletIcon className="size-4 opacity-50" />,
							},
							{
								title: "Audit",
								href: "/admin/audit",
								icon: <ClipboardListIcon className="size-4 opacity-50" />,
							},
							{
								title: "Integrations",
								href: "/admin/integrations",
								icon: <PlaySquareIcon className="size-4 opacity-50" />,
							},
							{
								title: "Jobs",
								href: "/admin/jobs",
								icon: <CogIcon className="size-4 opacity-50" />,
							},
							{
								title: "Config",
								href: "/admin/config",
								icon: <CogIcon className="size-4 opacity-50" />,
							},
							{
								title: "Security",
								href: "/admin/security",
								icon: <ShieldIcon className="size-4 opacity-50" />,
							},
							{
								title: "Notifications",
								href: "/admin/notifications",
								icon: <BellIcon className="size-4 opacity-50" />,
							},
							...(config.organizations.enable
								? [
										{
											title: t("menu.organizations"),
											href: "/admin/organizations",
											icon: <Building2Icon className="size-4 opacity-50" />,
										},
									]
								: []),
						],
					},
				]}
			/>

			{children}
		</>
	);
}
