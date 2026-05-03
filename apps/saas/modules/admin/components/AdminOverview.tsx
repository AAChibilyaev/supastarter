"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";

const PREVIEW_LIMIT = 5;

export function AdminOverview() {
	const t = useTranslations("admin.overview");
	const usersQuery = useQuery(
		orpc.admin.users.list.queryOptions({
			input: { limit: PREVIEW_LIMIT, offset: 0 },
		}),
	);
	const organizationsQuery = useQuery(
		orpc.admin.organizations.list.queryOptions({
			input: { limit: PREVIEW_LIMIT, offset: 0 },
		}),
	);
	const unreadNotificationsQuery = useQuery(
		orpc.notifications.unreadCount.queryOptions({
			input: {},
		}),
	);

	const isLoading = usersQuery.isLoading || organizationsQuery.isLoading;

	return (
		<div className="gap-6 grid grid-cols-1">
			<div className="gap-4 md:grid-cols-3 grid grid-cols-1">
				<KpiCard
					title={t("usersTitle")}
					value={usersQuery.data?.total}
					fallback={t("noData")}
					isLoading={usersQuery.isLoading}
				/>
				<KpiCard
					title={t("organizationsTitle")}
					value={organizationsQuery.data?.total}
					fallback={t("noData")}
					isLoading={organizationsQuery.isLoading}
				/>
				<KpiCard
					title={t("unreadNotifications")}
					value={unreadNotificationsQuery.data?.count}
					fallback={t("noData")}
					isLoading={unreadNotificationsQuery.isLoading}
				/>
			</div>

			<div className="gap-4 xl:grid-cols-2 grid grid-cols-1">
				<Card>
					<CardHeader>
						<CardTitle>{t("recentUsers")}</CardTitle>
					</CardHeader>
					<CardContent className="gap-3 grid grid-cols-1">
						{isLoading
							? Array.from({ length: PREVIEW_LIMIT }).map((_, index) => (
									<Skeleton key={`users-${index}`} className="h-10 w-full" />
								))
							: (usersQuery.data?.users ?? []).map((user) => (
									<Card key={user.id} className="rounded-md">
										<CardContent className="p-3 text-sm flex items-center justify-between">
											<div>
												<p className="font-medium">
													{user.name ?? user.email}
												</p>
												<p className="text-foreground/60">{user.email}</p>
											</div>
											<span className="text-xs text-foreground/60">
												{user.role ?? t("defaultRole")}
											</span>
										</CardContent>
									</Card>
								))}

						<Button asChild variant="outline">
							<Link href="/admin/users">{t("openUsers")}</Link>
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("recentOrganizations")}</CardTitle>
					</CardHeader>
					<CardContent className="gap-3 grid grid-cols-1">
						{isLoading
							? Array.from({ length: PREVIEW_LIMIT }).map((_, index) => (
									<Skeleton key={`orgs-${index}`} className="h-10 w-full" />
								))
							: (organizationsQuery.data?.organizations ?? []).map((organization) => (
									<Card key={organization.id} className="rounded-md">
										<CardContent className="p-3 text-sm flex items-center justify-between">
											<div>
												<p className="font-medium">{organization.name}</p>
												<p className="text-foreground/60">
													{organization.slug ?? t("noSlug")}
												</p>
											</div>
											<span className="text-xs text-foreground/60">
												{t("membersCount", {
													count: organization.membersCount,
												})}
											</span>
										</CardContent>
									</Card>
								))}

						<Button asChild variant="outline">
							<Link href="/admin/organizations">{t("openOrganizations")}</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function KpiCard({
	title,
	value,
	fallback,
	isLoading,
}: {
	title: string;
	value: number | undefined;
	fallback: string;
	isLoading: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-8 w-20" />
				) : (
					<p className="font-semibold text-3xl">
						{typeof value === "number" ? value : fallback}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
