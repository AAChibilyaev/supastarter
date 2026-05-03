"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { EmptyState } from "@search/components/cards/EmptyState";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { BarChart3Icon, EyeIcon, ShoppingBagIcon, TrendingUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface RecommendationsDashboardCardsProps {
	organizationId: string;
}

function StatCard({
	title,
	value,
	icon: Icon,
	loading,
}: {
	title: string;
	value: string;
	icon: React.ComponentType<{ className?: string }>;
	loading: boolean;
}) {
	return (
		<Card>
			<CardContent className="gap-4 pt-6 flex items-start">
				<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-primary/10">
					<Icon className="size-5 text-primary" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm text-muted-foreground">{title}</p>
					{loading ? (
						<Skeleton className="mt-1 h-7 w-20" />
					) : (
						<p className="mt-0.5 text-2xl font-bold">{value}</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function TrendingCard({
	title,
	items,
	loading,
	emptyLabel,
}: {
	title: string;
	items: Array<{ title: string; activityCount: number }>;
	loading: boolean;
	emptyLabel: string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="gap-2 text-base flex items-center">
					<TrendingUpIcon className="size-4 text-primary" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-8 w-full" />
						))}
					</div>
				) : items.length === 0 ? (
					<EmptyState variant="inline" description={emptyLabel} />
				) : (
					<div className="space-y-2">
						{items.map((item, idx) => (
							<div
								key={idx}
								className="gap-3 px-3 py-2 flex items-center justify-between rounded-lg border bg-card"
							>
								<div className="gap-3 min-w-0 flex items-center">
									<span className="size-6 rounded text-xs font-medium flex shrink-0 items-center justify-center bg-muted text-muted-foreground">
										{idx + 1}
									</span>
									<span className="text-sm font-medium truncate">
										{item.title}
									</span>
								</div>
								<Badge status="info" className="shrink-0">
									{item.activityCount}
								</Badge>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export function RecommendationsDashboardCards({
	organizationId,
}: RecommendationsDashboardCardsProps) {
	const t = useTranslations("search");

	const { data: trending7d, isLoading: loading7d } = useQuery(
		orpc.recommendations.trending.queryOptions({
			input: { organizationId, window: "7", limit: 10 },
		}),
	);

	const { data: trending30d, isLoading: loading30d } = useQuery(
		orpc.recommendations.trending.queryOptions({
			input: { organizationId, window: "30", limit: 10 },
		}),
	);

	const neo4jConnected = !loading7d && (trending7d?.neo4jConnected ?? false);

	if (!neo4jConnected && !loading7d) {
		return (
			<Card>
				<CardContent className="pt-6">
					<EmptyState
						title={t("recommendations.comingSoon")}
						description={t("recommendations.neo4jDisconnected")}
					/>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Stats cards row */}
			<div className="gap-4 md:grid-cols-3 grid">
				<StatCard
					title={t("recommendations.stats.recommendationsServed")}
					value="--"
					icon={BarChart3Icon}
					loading={loading7d}
				/>
				<StatCard
					title={t("recommendations.stats.clickThroughRate")}
					value="--"
					icon={EyeIcon}
					loading={loading7d}
				/>
				<StatCard
					title={t("recommendations.stats.popularItems")}
					value={String(trending7d?.results.length ?? 0)}
					icon={ShoppingBagIcon}
					loading={loading7d}
				/>
			</div>

			{/* Trending cards */}
			<div className="gap-4 md:grid-cols-2 grid">
				<TrendingCard
					title={t("recommendations.stats.trendingNow") + " (7d)"}
					items={trending7d?.results ?? []}
					loading={loading7d}
					emptyLabel={t("recommendations.stats.trendingNowEmpty")}
				/>
				<TrendingCard
					title={t("recommendations.stats.trendingNow") + " (30d)"}
					items={trending30d?.results ?? []}
					loading={loading30d}
					emptyLabel={t("recommendations.stats.trendingNowEmpty")}
				/>
			</div>
		</div>
	);
}
