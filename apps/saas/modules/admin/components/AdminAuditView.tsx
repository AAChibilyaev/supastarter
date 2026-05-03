"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

const ITEMS_LIMIT = 10;

export function AdminAuditView() {
	const t = useTranslations("admin.audit");
	const usersQuery = useQuery(
		orpc.admin.users.list.queryOptions({
			input: {
				limit: ITEMS_LIMIT,
				offset: 0,
			},
		}),
	);
	const organizationsQuery = useQuery(
		orpc.admin.organizations.list.queryOptions({
			input: {
				limit: ITEMS_LIMIT,
				offset: 0,
			},
		}),
	);

	return (
		<div className="gap-4 xl:grid-cols-2 grid grid-cols-1">
			<Card>
				<CardHeader>
					<CardTitle>{t("recentUserChanges")}</CardTitle>
				</CardHeader>
				<CardContent className="gap-2 grid grid-cols-1">
					{usersQuery.isLoading
						? Array.from({ length: 6 }).map((_, index) => (
								<Skeleton key={`audit-users-${index}`} className="h-10 w-full" />
							))
						: (usersQuery.data?.users ?? []).map((user) => (
								<Card key={user.id} className="rounded-md">
									<CardContent className="p-3 text-sm flex items-center justify-between">
										<div>
											<p className="font-medium">{user.name ?? user.email}</p>
											<p className="text-foreground/60">{user.email}</p>
										</div>
										<div className="text-right">
											<p className="text-xs text-foreground/60">{user.role ?? t("defaultRole")}</p>
											<p className="text-xs text-foreground/60">
												{new Date(user.updatedAt).toLocaleString()}
											</p>
										</div>
									</CardContent>
								</Card>
							))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("recentOrgChanges")}</CardTitle>
				</CardHeader>
				<CardContent className="gap-2 grid grid-cols-1">
					{organizationsQuery.isLoading
						? Array.from({ length: 6 }).map((_, index) => (
								<Skeleton key={`audit-orgs-${index}`} className="h-10 w-full" />
							))
						: (organizationsQuery.data?.organizations ?? []).map((organization) => (
								<Card key={organization.id} className="rounded-md">
									<CardContent className="p-3 text-sm flex items-center justify-between">
										<div>
											<p className="font-medium">{organization.name}</p>
											<p className="text-foreground/60">{organization.slug ?? t("noSlug")}</p>
										</div>
										<div className="text-right">
											<p className="text-xs text-foreground/60">
												{organization.membersCount} members
											</p>
											<p className="text-xs text-foreground/60">
												{new Date(organization.createdAt).toLocaleString()}
											</p>
										</div>
									</CardContent>
								</Card>
							))}
				</CardContent>
			</Card>
		</div>
	);
}
