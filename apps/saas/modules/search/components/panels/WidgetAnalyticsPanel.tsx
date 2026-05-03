"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { SearchAnalyticsCards } from "@search/components/cards/SearchAnalyticsCards";
import { useSearchIndexesQuery } from "@search/lib/api";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

interface WidgetAnalyticsPanelProps {
	organizationId: string;
}

export function WidgetAnalyticsPanel({ organizationId }: WidgetAnalyticsPanelProps) {
	const t = useTranslations("search");
	const [selectedIndexSlug, setSelectedIndexSlug] = useState("");

	const { data: indexes, isLoading: indexesLoading } = useSearchIndexesQuery(organizationId);

	// Auto-select first index
	useEffect(() => {
		if (!selectedIndexSlug && indexes && indexes.length > 0) {
			setSelectedIndexSlug(indexes[0].slug);
		}
	}, [indexes, selectedIndexSlug]);

	// Find the index ID from the slug
	const selectedIndex = useMemo(
		() => indexes?.find((idx) => idx.slug === selectedIndexSlug),
		[indexes, selectedIndexSlug],
	);

	// Widget analytics data
	const { data: analyticsData, isLoading: analyticsLoading } = useQuery(
		orpc.search.analytics.queryOptions({
			input: {
				organizationId,
				period: "last7",
				...(selectedIndex?.id ? { indexId: selectedIndex.id } : {}),
			},
			enabled: !!organizationId,
		}),
	);

	if (indexesLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-80" />
			</div>
		);
	}

	if (!indexes || indexes.length === 0) {
		return (
			<Card>
				<CardContent className="py-12 flex flex-col items-center text-center">
					<p className="text-sm text-muted-foreground">
						{t("widgetConfigurator.noIndexes")}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Index selector */}
			<div className="gap-3 flex items-center">
				<label className="text-sm font-medium shrink-0">
					{t("widgetConfigurator.selectIndex")}
				</label>
				<select
					value={selectedIndexSlug}
					onChange={(e) => setSelectedIndexSlug(e.target.value)}
					className="w-72 h-10 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<option value="" disabled>
						{t("widgetConfigurator.selectIndexPlaceholder")}
					</option>
					{(indexes ?? []).map((idx) => (
						<option key={idx.slug} value={idx.slug}>
							{idx.displayName ?? idx.slug}
						</option>
					))}
				</select>
			</div>

			{analyticsLoading ? (
				<div className="gap-4 sm:grid-cols-3 grid">
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
				</div>
			) : (
				<SearchAnalyticsCards
					organizationId={organizationId}
					period="last7"
					indexId={selectedIndex?.id}
				/>
			)}

			{/* Widget-specific metrics */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{t("widget.analyticsWidgetMetrics") || "Widget Performance"}
					</CardTitle>
					<CardDescription>
						{t("widget.analyticsWidgetDesc") ||
							"Search metrics from the widget installation."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{analyticsData ? (
						<div className="gap-4 sm:grid-cols-3 grid">
							<Card className="shadow-sm">
								<CardHeader className="pb-2">
									<CardTitle className="text-2xl font-bold tabular-nums">
										{analyticsData.totalSearches ?? 0}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-xs text-muted-foreground">
										{t("analytics.totalSearches") || "Total Searches"}
									</p>
								</CardContent>
							</Card>
							<Card className="shadow-sm">
								<CardHeader className="pb-2">
									<CardTitle className="text-2xl font-bold tabular-nums">
										{analyticsData.totalSessions ?? 0}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-xs text-muted-foreground">
										{t("analytics.totalSessions") || "Widget Opens"}
									</p>
								</CardContent>
							</Card>
							<Card className="shadow-sm">
								<CardHeader className="pb-2">
									<CardTitle className="text-2xl font-bold tabular-nums">
										{analyticsData.ctr != null
											? `${(analyticsData.ctr * 100).toFixed(1)}%`
											: "—"}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-xs text-muted-foreground">
										{t("analytics.ctr") || "Click-through Rate"}
									</p>
								</CardContent>
							</Card>
						</div>
					) : (
						<p className="text-sm py-8 text-center text-muted-foreground">
							{t("analytics.noData") || "No analytics data yet"}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
