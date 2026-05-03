"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { ActivityIcon, DatabaseIcon, KeyIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormatter } from "next-intl";

import { EmptyState } from "./EmptyState";

interface ActivityLogProps {
	organizationId: string;
	limit?: number;
}

const ACTIVITY_ICONS: Record<string, { icon: typeof ActivityIcon; color: string }> = {
	index_created: { icon: DatabaseIcon, color: "text-blue-500" },
	api_key_created: { icon: KeyIcon, color: "text-amber-500" },
	usage_event: { icon: SearchIcon, color: "text-green-500" },
	sync_job: { icon: RefreshCwIcon, color: "text-purple-500" },
};

export function ActivityLog({ organizationId, limit = 50 }: ActivityLogProps) {
	const t = useTranslations();
	const format = useFormatter();

	const { data, isLoading } = useQuery(
		orpc.search.recentActivity.queryOptions({
			input: { organizationId, limit },
			enabled: !!organizationId,
		}),
	);

	const activities = data?.activities ?? [];

	// Group activities by date
	const grouped = activities.reduce((groups: Record<string, typeof activities>, activity) => {
		const date = activity.createdAt.slice(0, 10);
		if (!groups[date]) groups[date] = [];
		groups[date].push(activity);
		return groups;
	}, {});

	const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("search.analytics.recentActivity")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{[1, 2, 3, 4, 5].map((i) => (
						<div key={i} className="gap-3 flex items-start">
							<Skeleton className="size-8 shrink-0 rounded-full" />
							<div className="space-y-2 flex-1">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		);
	}

	if (activities.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("search.analytics.recentActivity")}</CardTitle>
				</CardHeader>
				<CardContent>
					<EmptyState variant="inline" description={t("search.analytics.noActivity")} />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("search.analytics.recentActivity")}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					{sortedDates.map((date) => (
						<div key={date}>
							<h4 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
								{format.dateTime(new Date(date), {
									weekday: "long",
									month: "long",
									day: "numeric",
								})}
							</h4>
							<div className="space-y-1">
								{grouped[date].map((activity) => {
									const config = ACTIVITY_ICONS[activity.kind] ?? {
										icon: ActivityIcon,
										color: "text-muted-foreground",
									};
									const Icon = config.icon;

									return (
										<div
											key={activity.id}
											className="gap-3 px-2 py-2 flex items-start rounded-md transition-colors hover:bg-muted/50"
										>
											<div
												className={`mt-0.5 size-8 flex items-center justify-center rounded-full bg-muted ${config.color}`}
											>
												<Icon className="size-4" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="gap-2 flex flex-wrap items-center">
													<p className="text-sm font-medium">
														{activity.label}
													</p>
													{activity.indexSlug && (
														<Badge className="text-[10px]">
															{activity.indexSlug}
														</Badge>
													)}
												</div>
												<p className="text-xs line-clamp-1 text-muted-foreground">
													{activity.description}
												</p>
											</div>
											<div className="text-xs shrink-0 text-muted-foreground">
												{format.relativeTime(new Date(activity.createdAt))}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
