"use client";

import { OrganizationLogo } from "@organizations/components/OrganizationLogo";
import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { useOrganizationListQuery } from "@organizations/lib/api";
import { config } from "@repo/auth/config";
import { Card } from "@repo/ui/components/card";
import { ChevronRightIcon, PlusCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function OrganizationsGrid() {
	const t = useTranslations();
	const router = useRouter();

	const { setActiveOrganization } = useActiveOrganization();
	const { data: allOrganizations } = useOrganizationListQuery();

	const handleClick = async (organizationSlug: string) => {
		await setActiveOrganization(organizationSlug);
		router.replace(`/${organizationSlug}`);
	};

	return (
		<div className="@container">
			<h2 className="mb-2 font-semibold text-lg">
				{t("organizations.organizationsGrid.title")}
			</h2>
			<div className="@2xl:grid-cols-3 @lg:grid-cols-2 gap-4 grid grid-cols-1">
				{allOrganizations?.map((organization) => (
					<Card
						key={organization.id}
						className="gap-4 p-4 flex cursor-pointer items-center overflow-hidden"
						onClick={() => handleClick(organization.slug)}
					>
						<OrganizationLogo
							name={organization.name}
							logoUrl={organization.logo}
							className="size-12"
						/>
						<span className="gap-1 text-base leading-tight flex items-center">
							<span className="font-medium block">{organization.name}</span>
							<ChevronRightIcon className="size-4" />
						</span>
					</Card>
				))}

				{config.organizations.enableUsersToCreateOrganizations && (
					<Link
						href="/new-organization"
						className="gap-2 p-4 flex h-full items-center justify-center rounded-2xl bg-primary/5 text-primary transition-colors duration-150 hover:bg-primary/10"
					>
						<PlusCircleIcon />
						<span className="font-medium text-sm">
							{t("organizations.organizationsGrid.createNewOrganization")}
						</span>
					</Link>
				)}
			</div>
		</div>
	);
}
