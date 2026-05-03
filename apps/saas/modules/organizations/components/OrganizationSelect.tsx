"use client";
import { useSession } from "@auth/hooks/use-session";
import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { useOrganizationListQuery } from "@organizations/lib/api";
import { usePlanData } from "@payments/hooks/plan-data";
import { usePurchases } from "@payments/hooks/purchases";
import { config as authConfig } from "@repo/auth/config";
import { config as paymentsConfig } from "@repo/payments/config";
import { cn } from "@repo/ui";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { UserAvatar } from "@shared/components/UserAvatar";
import { useRouter } from "@shared/hooks/router";
import { clearCache } from "@shared/lib/cache";
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { OrganizationLogo } from "./OrganizationLogo";

export function OrganzationSelect({
	className,
	collapsed = false,
}: {
	className?: string;
	collapsed?: boolean;
}) {
	const t = useTranslations();
	const { user } = useSession();
	const router = useRouter();
	const { activeOrganization, setActiveOrganization } = useActiveOrganization();
	const { data: allOrganizations } = useOrganizationListQuery();
	const { planData } = usePlanData();
	const { activePlan: orgActivePlan } = usePurchases(activeOrganization?.id);
	const { activePlan: userActivePlan } = usePurchases();

	if (!user) {
		return null;
	}

	const getPlanTitle = (planId: string | undefined) => {
		if (!planId) {
			return null;
		}
		const plan = planData[planId as keyof typeof planData];
		return plan?.title ?? null;
	};

	const triggerButton = (
		<DropdownMenuTrigger
			className={cn(
				"gap-3 flex w-full items-center justify-between text-left transition-colors outline-none",
				{
					"justify-center": collapsed,
					"p-1 rounded-lg hover:bg-muted/50": collapsed,
				},
			)}
		>
			<div
				className={cn("gap-3 flex items-center overflow-hidden", {
					"justify-center": collapsed,
				})}
			>
				{activeOrganization ? (
					<>
						<OrganizationLogo
							name={activeOrganization.name}
							logoUrl={activeOrganization.logo}
							className={cn("size-10 shrink-0 rounded-md")}
						/>
						{!collapsed && (
							<div className="min-w-0 flex flex-1 flex-col">
								<span className="text-sm font-semibold truncate text-foreground">
									{activeOrganization.name}
								</span>
								{paymentsConfig.billingAttachedTo === "organization" &&
									orgActivePlan && (
										<span className="text-xs font-medium truncate text-primary">
											{getPlanTitle(orgActivePlan.id)}
										</span>
									)}
							</div>
						)}
					</>
				) : (
					<>
						<UserAvatar
							className={cn("size-10 shrink-0 rounded-md")}
							name={user.name ?? ""}
							avatarUrl={user.image}
						/>
						{!collapsed && (
							<div className="min-w-0 flex flex-1 flex-col">
								<span className="text-sm font-semibold truncate text-foreground">
									{t("organizations.organizationSelect.personalAccount")}
								</span>
								{paymentsConfig.billingAttachedTo === "user" && userActivePlan && (
									<span className="text-xs font-medium truncate text-primary">
										{getPlanTitle(userActivePlan.id)}
									</span>
								)}
							</div>
						)}
					</>
				)}
			</div>

			{!collapsed && <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />}
		</DropdownMenuTrigger>
	);

	const triggerContent = collapsed ? (
		<Tooltip>
			<TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
			<TooltipContent side="right">
				{activeOrganization
					? activeOrganization.name
					: t("organizations.organizationSelect.personalAccount")}
			</TooltipContent>
		</Tooltip>
	) : (
		triggerButton
	);

	const dropdownContent = (
		<DropdownMenuContent className="w-full">
			{!authConfig.organizations.requireOrganization && (
				<>
					<DropdownMenuRadioGroup
						value={activeOrganization?.id ?? user.id}
						onValueChange={async (value: string) => {
							if (value === user.id) {
								await clearCache();
								await setActiveOrganization(null);
								router.replace("/");
							}
						}}
					>
						<DropdownMenuLabel className="text-xs text-foreground/60">
							{t("organizations.organizationSelect.personalAccount")}
						</DropdownMenuLabel>
						<DropdownMenuRadioItem
							value={user.id}
							className="gap-2 pl-3 flex cursor-pointer items-center justify-center"
						>
							<div className="gap-2 flex flex-1 items-center justify-start">
								<UserAvatar
									className="size-8 rounded-md"
									name={user.name ?? ""}
									avatarUrl={user.image}
								/>
								{user.name}
							</div>
						</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
					<DropdownMenuSeparator />
				</>
			)}
			<DropdownMenuRadioGroup
				value={activeOrganization?.slug}
				onValueChange={async (organizationSlug: string) => {
					await clearCache();
					await setActiveOrganization(organizationSlug);
					router.replace(`/${organizationSlug}`);
				}}
			>
				<DropdownMenuLabel className="text-xs text-foreground/60">
					{t("organizations.organizationSelect.organizations")}
				</DropdownMenuLabel>
				{allOrganizations?.map((organization) => (
					<DropdownMenuRadioItem
						key={organization.slug}
						value={organization.slug}
						className="gap-2 pl-3 flex cursor-pointer items-center justify-center"
					>
						<div className="gap-2 flex flex-1 items-center justify-start">
							<OrganizationLogo
								className="size-8"
								name={organization.name}
								logoUrl={organization.logo}
							/>
							{organization.name}
						</div>
					</DropdownMenuRadioItem>
				))}
			</DropdownMenuRadioGroup>

			{authConfig.organizations.enableUsersToCreateOrganizations && (
				<DropdownMenuGroup>
					<DropdownMenuItem asChild className="text-sm cursor-pointer text-primary!">
						<Link href="/new-organization">
							<PlusIcon className="mr-2 size-6 p-1 rounded-md bg-primary/20" />
							{t("organizations.organizationSelect.createNewOrganization")}
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			)}
		</DropdownMenuContent>
	);

	const content = (
		<DropdownMenu>
			{triggerContent}
			{dropdownContent}
		</DropdownMenu>
	);

	if (collapsed) {
		return (
			<div className={className}>
				<TooltipProvider delayDuration={0}>{content}</TooltipProvider>
			</div>
		);
	}

	return <div className={className}>{content}</div>;
}
