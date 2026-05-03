"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { StatsTile } from "@shared/components/StatsTile";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { SparklesIcon, TrendingUpIcon, BarChart3Icon, ShoppingBagIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "../cards/EmptyState";

interface RecommendationsDashboardCardsProps {
	organizationId: string;
}

export function RecommendationsDashboardCards({
	organizationId,
}: RecommendationsDashboardCardsProps) {
	const tr = useTranslations("search");

	const { data: trendingData, isLoading: trendingLoading } = useQuery(
		orpc.recommendations.trending.queryOptions({
			input: { organizationId, window: "7", limit: 10 },
		}),
	);

	const isLoading = trendingLoading;
	const neo4jOk = trendingData?.neo4jConnected;

	if (!isLoading && neo4jOk === false) {
		return (
			<Card>
				<CardContent className="pt-6">
					<EmptyState
						title={tr("recommendations.comingSoon")}
						description={tr("recommendations.neo4jDisconnected")}
					/>
				</CardContent>
			</Card>
		);
	}

	const popularCount = trendingData?.results.length ?? 0;
	const totalActivity = trendingData?.results.reduce((sum, r) => sum + r.activityCount, 0) ?? 0;

	return (
		<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid">
			<StatsTile
				title={tr("recommendations.stats.recommendationsServed")}
				value={totalActivity}
				valueFormat="number"
				context={tr("recommendations.stats.recommendationsServedDesc")}
				icon={<SparklesIcon className="size-4" />}
			/>
			<StatsTile
				title={tr("recommendations.stats.clickThroughRate")}
				value={0}
				valueFormat="percentage"
				context={tr("recommendations.stats.clickThroughRateDesc")}
				icon={<BarChart3Icon className="size-4" />}
			/>
			<StatsTile
				title={tr("recommendations.stats.popularItems")}
				value={popularCount}
				valueFormat="number"
				context={tr("recommendations.stats.popularItemsDesc")}
				icon={<ShoppingBagIcon className="size-4" />}
			/>
			<StatsTile
				title={tr("recommendations.stats.trendingNow")}
				value={popularCount}
				valueFormat="number"
				context={tr("recommendations.stats.trendingNowDesc")}
				icon={<TrendingUpIcon className="size-4" />}
			/>

			{popularCount > 0 && (
				<div className="md:col-span-2 lg:col-span-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								{tr("recommendations.stats.trendingNow")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{trendingData?.results.slice(0, 5).map((item) => (
									<div
										key={item.id}
										className="p-3 flex items-center justify-between rounded-lg border"
									>
										<span className="font-medium">{item.title}</span>
										<span className="text-sm text-muted-foreground">
											{item.activityCount} views
										</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
