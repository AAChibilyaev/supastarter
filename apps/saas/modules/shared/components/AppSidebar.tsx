"use client";

import { useSession } from "@auth/hooks/use-session";
import { OrganzationSelect } from "@organizations/components/OrganizationSelect";
import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { config as authConfig } from "@repo/auth/config";
import { config as paymentsConfig } from "@repo/payments/config";
import {
	Logo,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarTrigger,
	cn,
	useSidebar,
} from "@repo/ui";
import { NotificationCenter } from "@shared/components/NotificationCenter";
import { UserMenu } from "@shared/components/UserMenu";
import {
	BarChart3Icon,
	CableIcon,
	HomeIcon,
	LightbulbIcon,
	RocketIcon,
	SearchIcon,
	SettingsIcon,
	ShieldUserIcon,
	SlidersHorizontalIcon,
	UserCogIcon,
	SparklesIcon,
	PuzzleIcon,
	CodeIcon,
	BookOpenIcon,
	StarIcon,
	FlameIcon,
	AlertTriangleIcon,
	ActivityIcon,
	ScrollTextIcon,
	WrenchIcon,
	ShuffleIcon,
	Volume2Icon,
	BotIcon,
	TagsIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface NavSubItem {
	label: string;
	href: string;
}

interface NavMenuItem {
	label: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	isActive: boolean;
	subItems?: NavSubItem[];
}

function isNavSubItemActive(pathname: string, href: string): boolean {
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
	const t = useTranslations();
	const pathname = usePathname();
	const { user } = useSession();
	const { state: sidebarState } = useSidebar();
	const sidebarCollapsed = sidebarState === "collapsed";
	const { activeOrganization, isOrganizationAdmin } = useActiveOrganization();

	const basePath = activeOrganization ? `/${activeOrganization.slug}` : "";
	const startHref = basePath || "/";

	const menuItems: NavMenuItem[] = useMemo(() => {
		const accountSubItems: NavSubItem[] = [
			{
				label: t("settings.menu.account.general"),
				href: "/settings/general",
			},
			{
				label: t("settings.menu.account.security"),
				href: "/settings/security",
			},
			{
				label: t("settings.menu.account.notifications"),
				href: "/settings/notifications",
			},
			...(paymentsConfig.billingAttachedTo === "user"
				? [
						{
							label: t("settings.menu.account.billing"),
							href: "/settings/billing",
						},
					]
				: []),
		];

		const orgSettingsPrefix = `${basePath}/settings`;
		const organizationSubItems: Array<NavSubItem> | undefined =
			authConfig.organizations.enable && activeOrganization && isOrganizationAdmin
				? [
						{
							label: t("settings.menu.organization.general"),
							href: `${orgSettingsPrefix}/general`,
						},
						{
							label: t("settings.menu.organization.members"),
							href: `${orgSettingsPrefix}/members`,
						},
						...(paymentsConfig.billingAttachedTo === "organization" &&
						isOrganizationAdmin
							? [
									{
										label: t("settings.menu.organization.billing"),
										href: `${orgSettingsPrefix}/billing`,
									},
								]
							: []),
					]
				: undefined;

		return [
			...(activeOrganization
				? [/* organization items above */]
				: [
						{
							label: t("app.menu.mySearch"),
							href: "/my-search",
							icon: StarIcon,
							isActive: pathname === "/my-search" || pathname.startsWith("/my-search/"),
						},
						{
							label: t("app.menu.start"),
							href: startHref,
							icon: HomeIcon,
							isActive: pathname === "/" || pathname === basePath,
						},
					]),
							icon: HomeIcon,
							isActive: pathname === `${basePath}/overview` || pathname === basePath,
						},
						{
							label: t("search.nav.gettingStarted"),
							href: `${basePath}/getting-started`,
							icon: RocketIcon,
							isActive: pathname.startsWith(`${basePath}/getting-started`),
						},
						{
							label: t("search.nav.search"),
							href: `${basePath}/search`,
							icon: SearchIcon,
							isActive:
								pathname.startsWith(`${basePath}/search`) ||
								pathname.startsWith(`${basePath}/api-keys`) ||
								pathname.startsWith(`${basePath}/import-jobs`) ||
								pathname.startsWith(`${basePath}/preview`),
							subItems: [
								{
									label: t("search.nav.indexes"),
									href: `${basePath}/search`,
								},
								{
									label: t("search.nav.apiKeys"),
									href: `${basePath}/api-keys`,
								},
								{
									label: t("search.nav.importJobs"),
									href: `${basePath}/import-jobs`,
								},
								{
									label: t("search.nav.searchPreview"),
									href: `${basePath}/preview`,
								},
								{
									label: t("search.nav.playground"),
									href: `${basePath}/search?tab=playground`,
								},
							],
						},
						{
							label: t("search.nav.analytics"),
							href: `${basePath}/analytics`,
							icon: BarChart3Icon,
							isActive: pathname.startsWith(`${basePath}/analytics`),
							subItems: [
								{
									label: t("search.nav.analyticsDashboard"),
									href: `${basePath}/analytics`,
								},
								{
									label: t("search.nav.analyticsTopQueries"),
									href: `${basePath}/analytics?tab=top-queries`,
								},
								{
									label: t("search.nav.analyticsFailed"),
									href: `${basePath}/analytics?tab=failed`,
								},
								{
									label: t("search.nav.analyticsActivity"),
									href: `${basePath}/analytics?tab=activity`,
								},
							],
						},
						{
							label: t("search.nav.relevance"),
							href: `${basePath}/relevance`,
							icon: SlidersHorizontalIcon,
							isActive: pathname.startsWith(`${basePath}/relevance`),
							subItems: [
								{
									label: t("search.nav.relevanceSynonyms"),
									href: `${basePath}/relevance?tab=synonyms`,
								},
								{
									label: t("search.nav.relevanceCurations"),
									href: `${basePath}/relevance?tab=curations`,
								},
								{
									label: t("search.nav.relevanceStemming"),
									href: `${basePath}/relevance?tab=stemming`,
								},
								{
									label: t("search.nav.relevanceStopwords"),
									href: `${basePath}/relevance?tab=stopwords`,
								},
								{
									label: t("search.nav.relevanceRanking"),
									href: `${basePath}/relevance?tab=ranking`,
								},
								{
									label: t("search.nav.relevanceSpell"),
									href: `${basePath}/relevance?tab=spell`,
								},
							],
						},
						{
							label: t("search.nav.connectors"),
							href: `${basePath}/connectors`,
							icon: CableIcon,
							isActive: pathname.startsWith(`${basePath}/connectors`),
							subItems: [
								{
									label: t("search.nav.connectorsCMS"),
									href: `${basePath}/connectors`,
								},
								{
									label: t("search.nav.connectorsWebhooks"),
									href: `${basePath}/connectors?tab=webhooks`,
								},
								{
									label: t("search.nav.connectorsSDK"),
									href: `${basePath}/connectors?tab=sdk`,
								},
							],
						},
						{
							label: t("search.nav.knowledge"),
							href: `${basePath}/knowledge`,
							icon: LightbulbIcon,
							isActive: pathname.startsWith(`${basePath}/knowledge`),
						},
						{
							label: t("search.nav.recommendations"),
							href: `${basePath}/recommendations`,
							icon: SparklesIcon,
							isActive: pathname.startsWith(`${basePath}/recommendations`),
							subItems: [
								{
									label: t("search.nav.recommendationsDashboard"),
									href: `${basePath}/recommendations`,
								},
								{
									label: t("search.nav.recommendationsSimilar"),
									href: `${basePath}/recommendations?tab=similar`,
								},
								{
									label: t("search.nav.recommendationsPersonalized"),
									href: `${basePath}/recommendations?tab=personalized`,
								},
								{
									label: t("search.nav.recommendationsGraphRAG"),
									href: `${basePath}/recommendations?tab=graphrag`,
								},
								{
									label: t("search.nav.recommendationsSettings"),
									href: `${basePath}/recommendations?tab=settings`,
								},
							],
						},
						{
							label: t("search.nav.widget"),
							href: `${basePath}/widget`,
							icon: PuzzleIcon,
							isActive: pathname.startsWith(`${basePath}/widget`),
							subItems: [
								{
									label: t("search.nav.widgetConfigurator"),
									href: `${basePath}/search-configurator`,
								},
								{
									label: t("search.nav.widgetFilters"),
									href: `${basePath}/widget?tab=filters`,
								},
								{
									label: t("search.nav.widgetAutocomplete"),
									href: `${basePath}/widget?tab=autocomplete`,
								},
								{
									label: t("search.nav.widgetVoice"),
									href: `${basePath}/widget?tab=voice`,
								},
								{
									label: t("search.nav.widgetAnalytics"),
									href: `${basePath}/widget?tab=analytics`,
								},
								{
									label: t("search.nav.widgetInstall"),
									href: `${basePath}/widget?tab=install`,
								},
							],
						},
					]
				: [
						{
							label: t("app.menu.start"),
							href: startHref,
							icon: HomeIcon,
							isActive: pathname === "/" || pathname === basePath,
						},
					]),
			...(organizationSubItems
				? [
						{
							label: t("app.menu.organizationSettings"),
							href: `${orgSettingsPrefix}/general`,
							icon: SettingsIcon,
							isActive: pathname.startsWith(`${orgSettingsPrefix}/`),
							subItems: organizationSubItems,
						},
					]
				: []),
			{
				label: t("app.menu.accountSettings"),
				href: "/settings/general",
				icon: UserCogIcon,
				isActive: pathname.startsWith("/settings/"),
				subItems: accountSubItems,
			},
			...(user?.role === "admin"
				? [
						{
							label: t("app.menu.admin"),
							href: "/admin",
							icon: ShieldUserIcon,
							isActive: pathname.startsWith("/admin/"),
						},
					]
				: []),
		];
	}, [activeOrganization, basePath, isOrganizationAdmin, pathname, startHref, t, user?.role]);

	return (
		<Sidebar collapsible="icon" variant="sidebar">
			<SidebarHeader className={cn("gap-3", sidebarCollapsed && "items-center")}>
				<div
					className={cn(
						"min-w-0 gap-2 flex w-full items-center",
						sidebarCollapsed ? "justify-center" : "justify-between",
					)}
				>
					<Link
						href="/"
						className={cn("flex shrink-0 items-center", sidebarCollapsed && "hidden")}
					>
						<Logo withLabel={false} />
					</Link>
					<SidebarTrigger className="shrink-0" />
				</div>
				<NotificationCenter className={cn("shrink-0", sidebarCollapsed && "self-center")} />
				{authConfig.organizations.enable && !authConfig.organizations.hideOrganization && (
					<OrganzationSelect collapsed={sidebarCollapsed} />
				)}
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{menuItems.map((menuItem) => {
								if (menuItem.subItems?.length) {
									return (
										<SidebarMenuItem key={menuItem.href}>
											<SidebarMenuButton
												asChild
												isActive={menuItem.isActive}
												tooltip={menuItem.label}
											>
												<Link href={menuItem.href}>
													<menuItem.icon />
													<span>{menuItem.label}</span>
												</Link>
											</SidebarMenuButton>
											<SidebarMenuSub>
												{menuItem.subItems.map((subItem) => (
													<SidebarMenuSubItem key={subItem.href}>
														<SidebarMenuSubButton
															asChild
															isActive={isNavSubItemActive(
																pathname,
																subItem.href,
															)}
														>
															<Link href={subItem.href}>
																<span>{subItem.label}</span>
															</Link>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												))}
											</SidebarMenuSub>
										</SidebarMenuItem>
									);
								}

								return (
									<SidebarMenuItem key={menuItem.href}>
										<SidebarMenuButton
											asChild
											isActive={menuItem.isActive}
											tooltip={menuItem.label}
										>
											<Link href={menuItem.href}>
												<menuItem.icon />
												<span>{menuItem.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className={cn(sidebarCollapsed && "items-center")}>
				<UserMenu compressed={sidebarCollapsed} showUserName={!sidebarCollapsed} />
			</SidebarFooter>
		</Sidebar>
	);
}
